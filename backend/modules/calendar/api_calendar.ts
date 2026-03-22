import * as config from 'config';
import { getRepeatedScheduler, runAgentTrigger } from "../..";
import { ApiInterfaceEmptyIn, ApiInterfaceEmptyOut } from '../../../api_common/backend_call';
import { ApiInterfaceCalendarIn, ApiInterfaceCalendarOut, Calendar } from "../../../api_common/calendar";
import { ApiModule } from "../../api_module";
import { ScheduledRepeatedEvent } from "../../framework/scheduled_events";
import { getAuthenticatedServiceAccount } from '../../framework/service-account';
import { SqlUpdate } from '../../framework/sqlite_database';
import { CalendarAPIHelper, CalendarSync } from './calendar_helper';
import { GoogleCalendarWatchHandler } from './calendar-webhook';
import { AccumulatedCalendarFilter } from './calendar_accumulated_filter';

export class ApiModuleCalendar extends ApiModule {

    helper: CalendarAPIHelper;
    calendarWatcher: GoogleCalendarWatchHandler;
    calendarID: string = "";
    calendarFilter: AccumulatedCalendarFilter = new AccumulatedCalendarFilter();

    updateCalInformationScheduler: ScheduledRepeatedEvent;

    modname(): string {
        return "calendar";
    }

    protected sqliteTableCreate(): SqlUpdate | undefined {
        return {
            params: [],
            update: "CREATE TABLE IF NOT EXISTS watches (\
                        id VARCHAR(64),\
                        resourceId VARCHAR(64),\
                        expiration int,\
                        channelName VARCHAR(64) NOT NULL\
                    \);\
                    CREATE TABLE IF NOT EXISTS geocoding (\
                        locstr VARCHAR(512) NOT NULL UNIQUE,\
                        lon FLOAT,\
                        lat FLOAT\
                    \);"
        };
    }

    async initialize() {
        this.calendarID = config.get('calendar.CALENDAR_ID');
        this.helper = new CalendarAPIHelper(this.sqlite());
        this.calendarWatcher = new GoogleCalendarWatchHandler(this.helper, this.sqlite());

        await this.calendarWatcher.init();
        await this.calendarWatcher.register();
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
                        this.logger().warn("Received calendar webhook call with unhandled resource state:", {state: dat.request.headers["x-goog-resource-state"]});
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
    }

    handleCalendarChangeWebhookCall() {
        this.updateCalendarData();
    }

    async updateCalendarData() {
        this.logger().info("Updating calendar information...");
        let calendarDat = await this.helper.getAllPublicCalendarEntriesIncr(this.calendarID, this.calendarFilter.getCurrentSyncToken());
        this.calendarFilter.accumulateCalendarData(calendarDat)
        this.logger().info("Updated calendar information! Found: " + this.calendarFilter.getCurrentCalendarState().entries.length + " public calendar entries!");
    }
}