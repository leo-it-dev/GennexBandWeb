import * as config from 'config';
import { CalendarEntry, CalendarList, Location } from '../../../api_common/calendar';
import { getLogger } from '../../logger';

export class CalendarHelper {

    private calendarApiKey = "";
    private baseLink = "https://www.googleapis.com/calendar/v3";
    private geocodingApiKey = "";
    private baseLinkGeocoding = "https://maps.googleapis.com/maps/api/geocode/json"

    private static logger = getLogger("calendar-helper");

    constructor() {
        this.calendarApiKey = config.get("calendar.CALENDAR_DATA_API_KEY") ?? "<unknown key>";
        this.geocodingApiKey = config.get("calendar.GEOCODING_DATA_API_KEY") ?? "<unknown key>";
    }

    // todo: implement sqlite based caching.
    async resolveLocationToLongLatUsingNominatim(locationName: string): Promise<Location> {
        return new Promise<Location>((res, rej) => {
            let searchPath = this.baseLinkGeocoding + "?address=" + encodeURIComponent(locationName) + "&key=" + this.geocodingApiKey;
            fetch(searchPath).then(dat => dat.json()).then(dat => {
                let latitude = dat.results[0].geometry.location.lat;
                let longitude = dat.results[0].geometry.location.lng;
                return res({
                    lon: longitude,
                    lat: latitude
                })
            }).catch(err => {
                rej("error resolving location: " + err);
            });
        });
    }

    async getAllPublicCalendarEntries(calendarID: string): Promise<CalendarList> {
        return new Promise<CalendarList>((res, _) => {
            fetch(this.baseLink + '/calendars/' + calendarID + '/events?maxResults=200&key=' + this.calendarApiKey)
                .then(async dat => {
                    let calendarData: CalendarList = { entries: [] };
                    if (dat.ok) {
                        let content = await dat.json();

                        for (let entry of content.items) {
                            if (entry.kind == "calendar#event") {
                                let title = entry.summary;
                                let description = entry.description;
                                let start = entry.start.dateTime;
                                let id = entry.id;
                                let locationString = entry.location;

                                let calendarEntry: CalendarEntry = {
                                    date: new Date(start),
                                    description: description,
                                    id: id,
                                    location: undefined,
                                    locationString: locationString,
                                    title: title
                                };

                                try {
                                    let location = await this.resolveLocationToLongLatUsingNominatim(locationString);
                                    calendarEntry.location = location;
                                    CalendarHelper.logger.info("Successfully resolved location string to lat/long coordinates: ", {locString: locationString, lat: location.lat, lon: location.lon});
                                } catch(err) {
                                    CalendarHelper.logger.error("Error resolving location string to lat/long coordinates: ", {locString: locationString});
                                }
                                calendarData.entries.push(calendarEntry);
                            }
                        }
                    }
                    res(calendarData);
                });
        });
    }
}
