import * as config from 'config';
import { getRepeatedScheduler } from "../..";
import { ApiInterfaceCalendarIn, ApiInterfaceCalendarOut, CalendarList } from "../../../api_common/calendar";
import { ApiModule } from "../../api_module";
import { ScheduledRepeatedEvent } from "../../framework/scheduled_events";
import { CalendarHelper } from './calendar_helper';

export class ApiModuleCalendar extends ApiModule {

    helper: CalendarHelper = new CalendarHelper();
    calendarID: string = "";

    updateCalInformationScheduler: ScheduledRepeatedEvent;

    calendarData: CalendarList = {entries: []};

    modname(): string {
        return "calendar";
    }

    async initialize() {
        this.calendarID = config.get('calendar.CALENDAR_ID');
    
        let updateInterval = parseInt(config.get("calendar.UPDATE_INTERVAL_MINUTES")) * 60;
        this.updateCalInformationScheduler = getRepeatedScheduler().scheduleRepeatedEvent(this, "Update Calendar Data", updateInterval, async () => {
            this.logger().info("Updating calendar information...");
            let calendarDat = await this.helper.getAllPublicCalendarEntries(this.calendarID);

            this.calendarData = calendarDat;

            this.logger().info("Updated calender information! Found: " + this.calendarData.entries.length + " public calendar entries!");
        }, true);
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceCalendarIn, ApiInterfaceCalendarOut>("calendar", async _ => {

            return {
                error: undefined,
                statusCode: 200,
                responseObject: {
                    calendar: this.calendarData
                }
            };
        });
    }
}