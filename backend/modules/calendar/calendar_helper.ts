import config from 'config';
import { Attachment, Calendar, CalendarEntry, CalendarEntryState, GeoCoding, Location, Visibility } from '../../../api_common/calendar';
import { ApiModuleLazy } from '../../api_module';
import { getAuthenticatedServiceAccount, ServiceAccountAccess } from '../../framework/service-account';
import { SQLiteDB } from '../../framework/sqlite_database';
import { getLogger } from '../../logger';
import { ApiModuleRenderedPDFs } from '../renderedpdf/api_renderedpdf';

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

    private baseLink = "https://www.googleapis.com/calendar/v3";
    private geocodingApiKey = "";
    private baseLinkGeocoding = "https://maps.googleapis.com/maps/api/geocode/json"

    private static logger = getLogger("calendar-helper");

    private pdfRenderer = new ApiModuleLazy(ApiModuleRenderedPDFs);

    constructor(private sqlite: SQLiteDB) {
        this.geocodingApiKey = config.get("calendar.GEOCODING_DATA_API_KEY") ?? "<unknown key>";
    }

    async resolveLocationToGeoCoding(locationName: string): Promise<GeoCoding> {
        return new Promise<GeoCoding>(async (res, rej) => {
            try {
                let cachedResult = this.getCachedGeocodingResult(locationName);
                if (cachedResult != undefined) {
                    res(cachedResult);
                    return;
                }
            } catch(err) {
                rej(err);
                return;
            }

            let searchPath = this.baseLinkGeocoding + "?address=" + encodeURIComponent(locationName) + "&key=" + this.geocodingApiKey + "&language=de";
            fetch(searchPath).then(dat => dat.json()).then(async dat => {
                let latitude = dat.results[0].geometry.location.lat;
                let longitude = dat.results[0].geometry.location.lng;

                function findComponent(name: string): any | undefined {
                    return (dat.results[0].address_components as any[]).find(e => e.types.includes(name));
                }

                let streetAddress   = findComponent('route')?.long_name ?? "";
                let addressLocality = findComponent('locality')?.long_name ?? "";
                let addressRegion   = findComponent('administrative_area_level_1')?.long_name ?? "";
                let postalCode      = parseInt(findComponent('postal_code')?.long_name ?? "0");
                let addressCountry  = findComponent('country')?.short_name ?? "";
                let streetNumber    = findComponent('street_number')?.short_name ?? "";
                let geocoding = {
                    addressCountry: addressCountry,
                    addressLocality: addressLocality,
                    addressRegion: addressRegion,
                    postalCode: postalCode,
                    streetAddress: streetAddress + " " + streetNumber,
                    location: {
                        lat: latitude,
                        lon: longitude
                    }
                };

                if (latitude != 0 && longitude != 0) {
                    this.storeGeocodingResult(locationName, geocoding);
                }

                CalendarAPIHelper.logger.info("Resolved location string using google api.", { locStr: locationName, lon: longitude, lat: latitude });

                res(geocoding);
            }).catch(err => {
                rej("error resolving location: " + err);
            });
        });
    }

    async getAllPublicCalendarEntriesIncr(calendarID: string, syncTokenIn: string): Promise<CalendarSync> {
        return new Promise<CalendarSync>(async (res, rej) => {
            let auth = await getAuthenticatedServiceAccount();
            if (!auth) {
                rej();
                return;
            }

            fetch(this.baseLink + '/calendars/' + calendarID + '/events?maxResults=200' + (syncTokenIn !== undefined ? "&syncToken=" + syncTokenIn : ""),
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
                                let id = entry.id;
                                let locationString = entry.location;
                                let state = entry.status == "cancelled" ? CalendarEntryState.DELETED : CalendarEntryState.DEFAULT;
                                let visibility = entry.visibility == "public" ? Visibility.PUBLIC : Visibility.PRIVATE
                                let attachments: Attachment[] = (entry.attachments as any[] || []).map(attachment => {
                                    return { title: attachment.title, url: attachment.fileUrl, mimeType: attachment.mimeType }
                                });

                                // If the service just started and we don't have a synch token google gives us ALL the calendar data.
                                // this includes deleted old events. This leads to us downloading unneccessary data from old deleted events.
                                // Therefore if we don't have a synch token yet skip all events marked as deleted.
                                // YES this DOES INDEED skip sending DELETED events for events deleted during service downtime, but this is better than
                                // unneccessary large startup times and google drive downloads. 
                                if (!syncTokenIn && state == CalendarEntryState.DELETED) {
                                    continue;
                                }

                                for(let attachment of attachments) {
                                    if (attachment.mimeType == "application/pdf") {
                                        try {
                                            await this.pdfRenderer.get().renderPdfToPngs(attachment.url, attachment.title);
                                        } catch(err) {
                                            CalendarAPIHelper.logger.error("Error downloading pdf attachment from calendar entry!", {error: err});
                                        }
                                    }
                                    if (attachment.mimeType.startsWith("image/")) {
                                        try {
                                            await this.pdfRenderer.get().publishImage(attachment.url, attachment.title);
                                        } catch(err) {
                                            CalendarAPIHelper.logger.error("Error downloading pdf attachment from calendar entry!", {error: err});
                                        }
                                    }
                                }

                                let calendarEntry: CalendarEntry = {
                                    date: new Date(entry.start.dateTime || entry.start.date),
                                    description: description,
                                    id: id,
                                    geocoding: undefined,
                                    locationString: locationString,
                                    title: title,
                                    state: state,
                                    visibility: visibility,
                                    attachments: attachments
                                };

                                if (locationString != undefined) {
                                    try {
                                        let geocoding = await this.resolveLocationToGeoCoding(locationString);
                                        calendarEntry.geocoding = geocoding;
                                        CalendarAPIHelper.logger.info("Successfully resolved location string to lat/long coordinates: ", { locString: locationString, geocoding: geocoding });
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

    async installCalendarWatcher(serviceAccount: ServiceAccountAccess, calendarId: string, webHookUrl: string, channelName: string, token: string, ttl = 604800): Promise<CalendarWatcherWebHook> {
        return new Promise<CalendarWatcherWebHook>((res, rej) => {
            fetch(this.baseLink + '/calendars/' + calendarId + '/events/watch', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + serviceAccount.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: channelName,
                    token: token,
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

    storeGeocodingResult(locStr: string, geocoding: GeoCoding) {
        CalendarAPIHelper.logger.info("Caching geocoding result", { locStr: locStr, coding: geocoding });
        this.sqlite.sqlUpdate({
            params: [locStr, geocoding.streetAddress, geocoding.addressLocality, geocoding.addressRegion, geocoding.postalCode, geocoding.addressCountry, geocoding.location.lon, geocoding.location.lat],
            update: "INSERT OR REPLACE INTO geocoding(locStr, streetAddress, addressLocality, addressRegion, postalCode, addressCountry, lon, lat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        });
    }

    getCachedGeocodingResult(locStr: string): GeoCoding | undefined {
        let rows = this.sqlite.sqlFetchAll("SELECT locStr, streetAddress, addressLocality, addressRegion, postalCode, addressCountry, lon, lat from geocoding WHERE locStr=?", [locStr]);
        if (rows.length > 0) {
            let lat = rows[0]["lat"];
            let lon = rows[0]["lon"];
            let streetAddress = rows[0]["streetAddress"];
            let addressLocality = rows[0]["addressLocality"];
            let addressRegion = rows[0]["addressRegion"];
            let postalCode = rows[0]["postalCode"];
            let addressCountry = rows[0]["addressCountry"];

            CalendarAPIHelper.logger.info("Fetched geocoding cache", { locStr: locStr, lon: lon, lat: lat });
            return { streetAddress: streetAddress, addressLocality: addressLocality, addressRegion: addressRegion, postalCode: postalCode, addressCountry: addressCountry, location: { lat: lat, lon: lon } };
        }
        return undefined;
    }
}
