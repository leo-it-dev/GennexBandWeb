import * as config from 'config';
import { CalendarList } from '../../../api_common/calendar';

export class CalendarHelper {

    private dataApiKey = "";
    private baseLink = "https://www.googleapis.com/calendar/v3";

    constructor() {
        this.dataApiKey = config.get("calendar.CALENDAR_DATA_API_KEY") ?? "<unknown key>";
    }

    async getAllPublicCalendarEntries(calendarID: string): Promise<CalendarList> {
        return new Promise<CalendarList>((res, _) => {
            fetch(this.baseLink + '/calendars/' + calendarID + '/events?maxResults=200&key=' + this.dataApiKey)
                .then(async dat => {
                    let calendarData: CalendarList = {entries: []};
                    if (dat.ok) {
                        let content = await dat.json();

                        for (let entry of content.items) {
                            if (entry.kind == "calendar#event") {
                                let title = entry.summary;
                                let description = entry.description;
                                let location = entry.location;
                                let start = entry.start.dateTime;
                                let id = entry.id;

                                calendarData.entries.push({
                                    date: new Date(start),
                                    description: description,
                                    title: title,
                                    location: location,
                                    id: id
                                });
                            }
                        }
                    }
                    res(calendarData);
                });
        });
    }
}
