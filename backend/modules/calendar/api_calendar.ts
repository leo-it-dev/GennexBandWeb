import * as config from 'config';
import { getApiModule, getBaseURL } from "../..";
import { ApiInterfaceEmptyIn, ApiInterfaceEmptyOut } from '../../../api_common/backend_call';
import { ApiInterfaceCalendarIn, ApiInterfaceCalendarOut, ApiInterfaceCalendarPublishIn, ApiInterfaceCalendarPublishOut, CalendarEntry } from "../../../api_common/calendar";
import { ApiModule } from "../../api_module";
import { generateJWTtoken, validateJWTtokenExtractPayload } from '../../framework/jwt';
import { ScheduledRepeatedEvent } from "../../framework/scheduled_events";
import { getAuthenticatedServiceAccount } from '../../framework/service-account';
import { SqlUpdate } from '../../framework/sqlite_database';
import { GoogleCalendarWatchHandler } from './calendar-webhook';
import { AccumulatedCalendarFilter } from './calendar_accumulated_filter';
import { CalendarAPIHelper } from './calendar_helper';
import { publishEventFormularVerificationTemplate, PublishFormularStatusCode } from '../../../api_common/verification';
import { ApiModuleSubscribe } from '../subscribe/api_subscribe';
import { MailNewEventMessage } from '../../email/event-new-message';
import { ApiModuleMailer } from '../mailer/api_mailer';

export class ApiModuleCalendar extends ApiModule {

    helper: CalendarAPIHelper;
    calendarWatcher: GoogleCalendarWatchHandler;
    calendarID: string = "";
    calendarFilter: AccumulatedCalendarFilter = new AccumulatedCalendarFilter();

    updateCalInformationScheduler: ScheduledRepeatedEvent;
    mailer: ApiModuleMailer;

    modname(): string {
        return "calendar";
    }

    protected sqliteTableCreate(): SqlUpdate[] | undefined {
        return [{
            params: [],
            update: "CREATE TABLE IF NOT EXISTS watches (\
                        id VARCHAR(64),\
                        resourceId VARCHAR(64),\
                        expiration int,\
                        channelName VARCHAR(64) NOT NULL\
                    \)"
        },
        {
            params: [],
            update: "CREATE TABLE IF NOT EXISTS geocoding (\
                        locstr VARCHAR(512) NOT NULL UNIQUE,\
                        lon FLOAT,\
                        lat FLOAT\
                    \)"
        }];
    }

    async initialize() {
        this.calendarID = config.get('calendar.CALENDAR_ID');
        this.helper = new CalendarAPIHelper(this.sqlite());
        this.calendarWatcher = new GoogleCalendarWatchHandler(this.helper, this.sqlite());

        this.mailer = getApiModule(ApiModuleMailer);
        
        await this.calendarWatcher.init();
        await this.calendarWatcher.register();
    }

    entryToToken(entry: CalendarEntry) {
        return generateJWTtoken({ entryID: entry.id });
    }
    tokenToEntry(token: object) {
        return token['entryID'];
    }

    generatePublishEventUrl(entry: CalendarEntry) {
        return getBaseURL() + "publishEvent?t=" + this.entryToToken(entry);
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceCalendarIn, ApiInterfaceCalendarOut>("calendar", async _ => {

            return {
                error: undefined,
                statusCode: 200,
                responseObject: {
                    calendar: this.calendarFilter.getCurrentCalendarState()
                }
            };
        });

        this.postJson<ApiInterfaceEmptyIn, ApiInterfaceEmptyOut>(this.calendarWatcher.getWebhookListenEndpoint(), async dat => {
            if ('x-goog-channel-id' in dat.request.headers) {
                if (dat.request.headers["x-goog-channel-id"] == this.calendarWatcher.getActiveChannelName()) {
                    if (dat.request.headers["x-goog-resource-state"] == "exists") {
                        this.logger().info("Received correct webhook call (incremental change):", dat.request.headers);
                        this.handleCalendarChangeWebhookCall();
                    } else if (dat.request.headers["x-goog-resource-state"] == "sync") {
                        this.logger().info("Received correct webhook call (initial sync):", dat.request.headers);
                        this.handleCalendarChangeWebhookCall();
                    } else {
                        this.logger().warn("Received calendar webhook call with unhandled resource state:", { state: dat.request.headers["x-goog-resource-state"] });
                    }
                } else {
                    this.logger().warn("Received out of band webhook call! Propably old not yet stopped webhook. Trying to stop.", { channelId: dat.request.headers["x-goog-channel-id"] });
                    let serviceAccount = await getAuthenticatedServiceAccount();
                    this.helper.deleteCalendarWatcher(serviceAccount, {
                        id: dat.request.headers["x-goog-channel-id"] as string,
                        resourceId: dat.request.headers["x-goog-resource-id"] as string,
                        channelName: '',
                        expiration: -1
                    }).catch(err => {
                        this.logger().error("Error deleting notification channel: ", { error: err })
                    })
                }
            } else {
                this.logger().error("Received out of band webhook call without channel id! This should not happen.");
            }
            return { error: undefined, responseObject: {}, statusCode: 200 };
        });

        this.postJson<ApiInterfaceCalendarPublishIn, ApiInterfaceCalendarPublishOut>("publish-event-to-newsletter", async req => {
            if (!publishEventFormularVerificationTemplate.verify(req.body)) {
                return {
                    error: 'Your request is malformed or your request data is too big!',
                    statusCode: 400,
                    responseObject: { result: PublishFormularStatusCode.MALFORMED_REQUEST }
                }
            }

            let token = validateJWTtokenExtractPayload(req.body.token);
            if (token) {
                let entryId = this.tokenToEntry(token);
                try {
                    let entry = this.calendarFilter.getCurrentCalendarState().entries.find(e => e.id == entryId);
                    if (!entry) {
                        return {
                            error: 'The requested event does not exist anymore!',
                            statusCode: 200,
                            responseObject: { result: PublishFormularStatusCode.INTERNAL_SERVER_ERROR }
                        }
                    }

                    let apiSubscribers = getApiModule(ApiModuleSubscribe);
                    let subscribers = apiSubscribers.getAllSubscriptions();
                    for (let subscriber of subscribers) {
                        // Prepare personalized emails, each as it's own batch mail.
                        let unsubLink = apiSubscribers.generateUnsubscribeUrl(subscriber);
                        let publishLink = getApiModule(ApiModuleCalendar).generatePublishEventUrl(entry);
                        let newEventMail = new MailNewEventMessage(entry, publishLink, false, unsubLink);
                        await this.mailer.queueBatchEmail(newEventMail.toBatchMail([subscriber]));
                    }

                    return {
                        error: undefined,
                        statusCode: 200,
                        responseObject: { result: PublishFormularStatusCode.PUBLISH_SUCCESS }
                    }

                } catch (e) {
                    this.logger().error("Error publishing newsletter emails!", { token: token, error: e });
                    return {
                        error: 'Error deleting your subscription!',
                        statusCode: 200,
                        responseObject: { result: PublishFormularStatusCode.INTERNAL_SERVER_ERROR }
                    }
                }
            } else {
                return {
                    error: 'Your token is invalid, malformed or not signed by our current crypto backend!',
                    statusCode: 200,
                    responseObject: { result: PublishFormularStatusCode.TOKEN_INVALID }
                }
            }
        });
    }

    handleCalendarChangeWebhookCall() {
        this.updateCalendarData();
    }

    async updateCalendarData() {
        this.logger().info("Updating calendar information...");
        let calendarDat = await this.helper.getAllPublicCalendarEntriesIncr(this.calendarID, this.calendarFilter.getCurrentSyncToken());
        await this.calendarFilter.accumulateCalendarData(calendarDat)
        this.logger().info("Updated calendar information! Found: " + this.calendarFilter.getCurrentCalendarState().entries.length + " public calendar entries!");
    }
}