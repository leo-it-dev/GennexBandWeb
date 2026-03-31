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
import { ApiModuleMailer, BatchEmail } from '../mailer/api_mailer';
import { MailModifiedEventMessage } from '../../email/event-modified-message';
import { MailDeletedEventMessage } from '../../email/event-deleted-message';
import { MailTemplate } from '../../email/mail-template';
import { match } from 'ts-pattern';

enum CalendarTokenAction {
    NEW = 'new', DELETE = 'delete', MODIFY = 'modify'
}

export type CalendarEntryChangeToken = {
    oldDate?: number,
    oldTitle?: string,
    oldDescription?: string,
    oldLocation?: string
};

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


    newEventEntryToToken(entry: CalendarEntry) {
        return generateJWTtoken({ entryID: entry.id, action: 'new' });
    }

    newEventTokenToEntry(token: object) {
        return {
            action: token['action'],
            entryID: token['entryID'],
            changes: token['change'] as CalendarEntryChangeToken
        };
    }


    deleteEventEntryToToken(entry: CalendarEntry) {
        return generateJWTtoken({
            action: 'delete',
            title: entry.title,
            description: entry.description,
            location: entry.locationString,
            date: entry.date.getTime(),
        });
    }

    deleteEventEntryFromToken(token: object) {
        return {
            date: new Date(token["date"]),
            title: token["title"],
            description: token["description"],
            locationString: token["location"],
        } as CalendarEntry;
    }
    modifyEventEntryToToken(entry: CalendarEntry, entryChange: CalendarEntryChangeToken) {
        return generateJWTtoken({ entryID: entry.id, change: entryChange, action: 'modify' });
    }


    generatePublishNewEventUrl(entry: CalendarEntry) {
        return getBaseURL() + "publishEventNew?t=" + this.newEventEntryToToken(entry);
    }

    generatePublishDeleteEventUrl(entry: CalendarEntry) {
        return getBaseURL() + "publishEventDel?t=" + this.deleteEventEntryToToken(entry);
    }

    generatePublishModifyEvent(entryChange: CalendarEntryChangeToken, entryNew: CalendarEntry) {
        return getBaseURL() + "publishEventMod?t=" + this.modifyEventEntryToToken(entryNew, entryChange);
    }


    getEventURL(entry: CalendarEntry) {
        return getBaseURL() + "event?eid=" + entry.id;
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
                // check if we need to publish a new event or publish a change in an event
                let tokenAction: CalendarTokenAction = token['action'];

                try {
                    let entry = undefined;
                    let changes: CalendarEntryChangeToken | undefined = undefined;
                    let apiSubscribers = getApiModule(ApiModuleSubscribe);
                    let subscribers = apiSubscribers.getAllSubscriptions();

                    if (tokenAction == CalendarTokenAction.NEW || tokenAction == CalendarTokenAction.MODIFY) {
                        let tokenBody = this.newEventTokenToEntry(token);
                        entry = this.calendarFilter.getCurrentCalendarState().entries.find(e => e.id == tokenBody.entryID);
                        if (!entry) {
                            return {
                                error: 'The requested event does not exist anymore!',
                                statusCode: 200,
                                responseObject: { result: PublishFormularStatusCode.INTERNAL_SERVER_ERROR }
                            }
                        }
                        changes = tokenBody.changes;
                    } else if (tokenAction == CalendarTokenAction.DELETE) {
                        entry = this.deleteEventEntryFromToken(token);
                    }

                    for (let subscriber of subscribers) {
                        // Prepare personalized emails, each as it's own batch mail.
                        let unsubLink = apiSubscribers.generateUnsubscribeUrl(subscriber);
                        let mail = match(tokenAction)
                            .with(CalendarTokenAction.NEW, () => new MailNewEventMessage(entry, undefined, false, unsubLink, this.getEventURL(entry)))
                            .with(CalendarTokenAction.MODIFY, () => new MailModifiedEventMessage(entry, changes, undefined, false, unsubLink, this.getEventURL(entry)))
                            .with(CalendarTokenAction.DELETE, () => new MailDeletedEventMessage(entry, undefined, false, unsubLink))
                            .exhaustive();
                        await this.mailer.queueBatchEmail(mail.toBatchMail([subscriber]));
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