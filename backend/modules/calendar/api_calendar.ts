import config from 'config';
import { match } from 'ts-pattern';
import { getBaseURL } from "../..";
import { ApiInterfaceEmptyIn, ApiInterfaceEmptyOut } from '../../../api_common/backend_call';
import { ApiInterfaceCalendarIn, ApiInterfaceCalendarOut, ApiInterfaceCalendarPublishIn, ApiInterfaceCalendarPublishOut, CalendarEntry } from "../../../api_common/calendar";
import { publishEventFormularVerificationTemplate, PublishFormularStatusCode } from '../../../api_common/verification';
import { ApiModule, ApiModuleLazy } from "../../api_module";
import { MailDeletedEventMessage } from '../../email/event-deleted-message';
import { MailModifiedEventMessage } from '../../email/event-modified-message';
import { MailNewEventMessage } from '../../email/event-new-message';
import { generateJWTtoken, validateJWTtokenExtractPayload } from '../../framework/jwt';
import { getAuthenticatedServiceAccount } from '../../framework/service-account';
import { SqlUpdate } from '../../framework/sqlite_database';
import { ApiModuleMailer } from '../mailer/api_mailer';
import { ApiModuleSubscribe } from '../subscribe/api_subscribe';
import { GoogleCalendarWatchHandler } from './calendar-webhook';
import { AccumulatedCalendarFilter } from './calendar_accumulated_filter';
import { CalendarAPIHelper } from './calendar_helper';

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

    helper?: CalendarAPIHelper;
    calendarWatcher?: GoogleCalendarWatchHandler;
    calendarID: string = "";
    calendarFilter: AccumulatedCalendarFilter = new AccumulatedCalendarFilter();

    mailer = new ApiModuleLazy(ApiModuleMailer);
    subscriberModule = new ApiModuleLazy(ApiModuleSubscribe);

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

    getCalendarHelper() {
        if (this.helper) {
            return this.helper;
        }
        throw Error("Calendar helper has not been instantiated yet!");
    }

    getCalendarWatcher() {
        if (this.calendarWatcher) {
            return this.calendarWatcher;
        }
        throw Error("Calendar watcher has not been instantiated yet!");
    }

    async initialize() {
        this.calendarID = config.get('calendar.CALENDAR_ID');
        this.helper = new CalendarAPIHelper(this.sqlite());
        this.calendarWatcher = new GoogleCalendarWatchHandler(this.helper, this.sqlite());

        await this.calendarWatcher.init();
        await this.calendarWatcher.register();
    }


    newEventEntryToToken(entry: CalendarEntry) {
        return generateJWTtoken({ entryID: entry.id, action: 'new' });
    }

    newEventTokenToEntry(token: any): {action: string, entryID: string, changes: CalendarEntryChangeToken} {
        return {
            action: token['action'] as string,
            entryID: token['entryID'] as string,
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

    deleteEventEntryFromToken(token: any): CalendarEntry {
        return {
            date: new Date(token["date"]),
            title: token["title"] as string,
            description: token["description"] as string,
            locationString: token["location"] as string,
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

        this.postJson<ApiInterfaceEmptyIn, ApiInterfaceEmptyOut>(this.getCalendarWatcher().getWebhookListenEndpoint(), async dat => {
            if ('x-goog-channel-id' in dat.request.headers) {
                if (dat.request.headers["x-goog-channel-id"] == this.getCalendarWatcher().getActiveChannelName()) {

                    if (dat.request.headers["x-goog-channel-token"] == this.getCalendarWatcher().getPrivateToken()) {
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
                        this.logger().warn("Received calendar webhook call with wrong private token!", {receivedToken: dat.request.headers["x-goog-channel-token"]});
                    }
                } else {
                    this.logger().warn("Received out of band webhook call! Propably old not yet stopped webhook. Trying to stop.", { channelId: dat.request.headers["x-goog-channel-id"] });
                    let serviceAccount = await getAuthenticatedServiceAccount();
                    if (serviceAccount) {
                        this.getCalendarHelper().deleteCalendarWatcher(serviceAccount, {
                            id: dat.request.headers["x-goog-channel-id"] as string,
                            resourceId: dat.request.headers["x-goog-resource-id"] as string,
                            channelName: '',
                            expiration: -1
                        }).catch(err => {
                            this.logger().error("Error deleting notification channel: ", { error: err })
                        })
                    } else {
                        this.logger().error("Error deleting notification channel: ", { error: "No service account access could be acquired!" });
                    }
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
                    let entry: CalendarEntry | undefined = undefined;
                    let changes: CalendarEntryChangeToken | undefined = undefined;
                    let subscribers = this.subscriberModule.get().getAllSubscriptions();

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
                        let unsubLink = this.subscriberModule.get().generateUnsubscribeUrl(subscriber);
                        let mail = match(tokenAction)
                            .with(CalendarTokenAction.NEW, () => new MailNewEventMessage(entry!, undefined, unsubLink, this.getEventURL(entry!)))
                            .with(CalendarTokenAction.MODIFY, () => new MailModifiedEventMessage(entry!, changes!, undefined, unsubLink, this.getEventURL(entry!)))
                            .with(CalendarTokenAction.DELETE, () => new MailDeletedEventMessage(entry!, undefined, unsubLink))
                            .exhaustive();
                        await this.mailer.get().queueBatchEmail(mail.toBatchMail([subscriber]));
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
        try {
            let calendarDat = await this.getCalendarHelper().getAllPublicCalendarEntriesIncr(this.calendarID, this.calendarFilter.getCurrentSyncToken());
            await this.calendarFilter.accumulateCalendarData(calendarDat)
            this.logger().info("Updated calendar information! Found: " + this.calendarFilter.getCurrentCalendarState().entries.length + " public calendar entries!");
        } catch(err) {
            this.logger().info("Error updating calendar information!", {err: err});
        }
    }
}