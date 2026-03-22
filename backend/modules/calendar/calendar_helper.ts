import * as config from 'config';
import { CalendarEntry, CalendarEntryState, Calendar, Location, Visibility, Attachment } from '../../../api_common/calendar';
import { getLogger } from '../../logger';
import { getAuthenticatedServiceAccount, ServiceAccountAccess } from '../../framework/service-account';
import { SQLiteDB } from '../../framework/sqlite_database';

export type CalendarWatcherWebHook = {
    id: string,
    resourceId: string,
    expiration: number,
    channelName: string
}

export type CalendarSync = {
    calendarList: Calendar,
    syncToken: string
}

export class CalendarAPIHelper {

    private calendarApiKey = "";
    private baseLink = "https://www.googleapis.com/calendar/v3";
    private geocodingApiKey = "";
    private baseLinkGeocoding = "https://maps.googleapis.com/maps/api/geocode/json"

    private static logger = getLogger("calendar-helper");

    constructor(private sqlite: SQLiteDB) {
        this.calendarApiKey = config.get("calendar.CALENDAR_DATA_API_KEY") ?? "<unknown key>";
        this.geocodingApiKey = config.get("calendar.GEOCODING_DATA_API_KEY") ?? "<unknown key>";
    }

    // todo: implement sqlite based caching.
    async resolveLocationToLongLat(locationName: string): Promise<Location> {
        return new Promise<Location>(async (res, rej) => {
            let cachedResult = await this.getCachedGeocodingResult(locationName);
            if (cachedResult != undefined) {
                res(cachedResult);
                return;
            }

            let searchPath = this.baseLinkGeocoding + "?address=" + encodeURIComponent(locationName) + "&key=" + this.geocodingApiKey;
            fetch(searchPath).then(dat => dat.json()).then(async dat => {
                let latitude = dat.results[0].geometry.location.lat;
                let longitude = dat.results[0].geometry.location.lng;

                if (latitude != 0 && longitude != 0) {
                    await this.storeGeocodingResult(locationName, longitude, latitude);
                }

                CalendarAPIHelper.logger.info("Resolved location string using google api.", { locStr: locationName, lon: longitude, lat: latitude });

                res({
                    lon: longitude,
                    lat: latitude
                })
            }).catch(err => {
                rej("error resolving location: " + err);
            });
        });
    }

    async getAllPublicCalendarEntriesIncr(calendarID: string, syncToken: string): Promise<CalendarSync> {
        return new Promise<CalendarSync>(async (res, _) => {
            let auth = await getAuthenticatedServiceAccount();
            fetch(this.baseLink + '/calendars/' + calendarID + '/events?maxResults=200' + (syncToken !== undefined ? "&syncToken=" + syncToken : ""),
            {
                headers: {
                    'Authorization': 'Bearer ' + auth.accessToken
                }
            })
                .then(async dat => {
                    let calendarData: Calendar = { entries: [] };
                    let synchToken = "";
                    if (dat.ok) {
                        let content = await dat.json();
                        synchToken = content.nextSyncToken;

                        for (let entry of content.items) {
                            if (entry.kind == "calendar#event") {
                                let title = entry.summary;
                                let description = entry.description;
                                let start = entry.start.dateTime || entry.start.date;
                                let id = entry.id;
                                let locationString = entry.location;
                                let state = entry.status == "cancelled" ? CalendarEntryState.DELETED : CalendarEntryState.DEFAULT;
                                let visibility = entry.visibility == "public" ? Visibility.PUBLIC : Visibility.PRIVATE
                                let attachments: Attachment[] = (entry.attachments as any[] || []).map(attachment => {
                                    return { title: attachment.title, url: attachment.fileUrl, mimeType: attachment.mimeType }
                                });

                                let calendarEntry: CalendarEntry = {
                                    date: new Date(start),
                                    description: description,
                                    id: id,
                                    location: undefined,
                                    locationString: locationString,
                                    title: title,
                                    state: state,
                                    visibility: visibility,
                                    attachments: attachments
                                };

                                if (locationString != undefined) {
                                    try {
                                        let location = await this.resolveLocationToLongLat(locationString);
                                        calendarEntry.location = location;
                                        CalendarAPIHelper.logger.info("Successfully resolved location string to lat/long coordinates: ", { locString: locationString, lat: location.lat, lon: location.lon });
                                    } catch (err) {
                                        CalendarAPIHelper.logger.error("Error resolving location string to lat/long coordinates: ", { locString: locationString });
                                    }
                                }
                                calendarData.entries.push(calendarEntry);
                            }
                        }
                    }
                    res({
                        calendarList: calendarData,
                        syncToken: synchToken
                    });
                });
        });
    }

    async installCalendarWatcher(serviceAccount: ServiceAccountAccess, calendarId: string, webHookUrl: string, channelName: string, ttl = 604800): Promise<CalendarWatcherWebHook> {
        return new Promise<CalendarWatcherWebHook>((res, rej) => {
            fetch(this.baseLink + '/calendars/' + calendarId + '/events/watch', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + serviceAccount.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: channelName,
                    type: "web_hook",
                    address: webHookUrl,
                    params: {
                        "ttl": ttl
                    }
                })
            }).then(dat => dat.json()).then(dat => {
                if ('expiration' in dat && 'id' in dat && 'resourceId' in dat) {
                    res({
                        expiration: parseInt(dat['expiration'] as string),
                        channelName: channelName,
                        id: dat['id'],
                        resourceId: dat['resourceId'],
                    });
                } else {
                    throw Error("Invalid response structure: " + JSON.stringify(dat));
                }
            }).catch(err => {
                rej(err);
            })
        });
    }

    public async deleteCalendarWatcher(serviceAccount: ServiceAccountAccess, watcherId: CalendarWatcherWebHook): Promise<void> {
        return new Promise<void>((res, rej) => {
            fetch(this.baseLink + '/channels/stop', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + serviceAccount.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: watcherId.id,
                    resourceId: watcherId.resourceId
                })
            }).then(async dat => {
                if (dat.ok || dat.status == 404) {
                    res();
                } else {
                    rej("Error deleting notification channel: " + JSON.stringify(dat.body));
                }
            }).catch(err => {
                rej(err);
            })
        });
    }


    // database -------------------------------------------

    async storeGeocodingResult(locStr: string, lon: number, lat: number): Promise<void> {
        CalendarAPIHelper.logger.info("Caching geocoding result", { locStr: locStr, lon: lon, lat: lat });
        return new Promise<void>((res, rej) => {
            this.sqlite.sqlUpdate({
                params: [locStr, lon, lat],
                update: "INSERT OR REPLACE INTO geocoding(locStr, lon, lat) VALUES (?, ?, ?)"
            }).then(() => res()).catch(err => rej(err));
        });
    }

    async getCachedGeocodingResult(locStr: string): Promise<Location> {
        return new Promise<Location>((res, rej) => {
            this.sqlite.sqlFetchAll("SELECT lon,lat from geocoding WHERE locStr=?", [locStr]).then(rows => {
                if (rows.length > 0) {
                    let lat = rows[0]["lat"];
                    let lon = rows[0]["lon"];
                    CalendarAPIHelper.logger.info("Fetched geocoding cache", { locStr: locStr, lon: lon, lat: lat });
                    res({ lat: lat, lon: lon });
                }
                res(undefined);
            }).catch(err => {
                rej(err);
            });
        });
    }
}
