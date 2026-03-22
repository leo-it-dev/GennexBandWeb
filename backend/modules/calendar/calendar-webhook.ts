import { getBaseURL } from "../..";
import { getAuthenticatedServiceAccount, ServiceAccountAccess } from "../../framework/service-account";
import { SQLiteDB } from "../../framework/sqlite_database";
import { getLogger } from "../../logger";
import { CalendarAPIHelper, CalendarWatcherWebHook } from "./calendar_helper";
import * as config from 'config';

export class GoogleCalendarWatchHandler {

    private logger = getLogger("google-calendar-watcher")
    private CALENDAR_ID = config.get('calendar.CALENDAR_ID') as string;
    private WEBHOOK_URL = getBaseURL() + "module/calendar/" + this.getWebhookListenEndpoint()
    private ACTIVE_CHANNEL_NAME = undefined;
    private watcherRefreshTimeoutId: NodeJS.Timeout;
    private SECONDS_TO_RENEW_WATCHER_BEFORE_TIMEOUT = 60;

    constructor(private helper: CalendarAPIHelper, private sqlite: SQLiteDB) {

    }


    public getWebhookListenEndpoint() {
        return "web-hook";
    }

    public getActiveChannelName() {
        return this.ACTIVE_CHANNEL_NAME;
    }

    public async init() {
        await this.deleteOldWatcherRegistrations();
    }

    public async register() {
        if (this.watcherRefreshTimeoutId != undefined) {
            this.logger.error("Tried to register google calendar push notification handler, but is already registered!");
            return;
        }
        this.registerNewCalendarWatcher().then((hook) => this.handleNewlyRegisteredWatcher(hook));
    }

    private async handleNewlyRegisteredWatcher(watcher: CalendarWatcherWebHook) {
        let timeoutToExpiration = watcher.expiration - new Date().getTime();
        this.ACTIVE_CHANNEL_NAME = watcher.channelName;

        this.watcherRefreshTimeoutId = setTimeout(async () => {
            this.watcherRefreshTimeoutId = undefined;
            try {
                await this.deleteOldWatcherRegistrations();
            } catch(err) {
                this.logger.error("Error deleting old google calendar watcher registration! " + err);
            }
            this.registerNewCalendarWatcher().then((watcher) => this.handleNewlyRegisteredWatcher(watcher));
        }, 1000 * (Math.round(timeoutToExpiration / 1000) - this.SECONDS_TO_RENEW_WATCHER_BEFORE_TIMEOUT));
    }

    private async deleteOldWatcherRegistrations() {
        return new Promise<void>((res, rej) => {
            this.getAllGoogleCalendarWatchersDB().then(async watchers => {
                try {
                    let serviceAccount = await getAuthenticatedServiceAccount();
                    for (let w of watchers) {
                        this.logger.info("Unregistering old calendar watcher entry from google: ", { entry: w });
                        await this.helper.deleteCalendarWatcher(serviceAccount, w);
                        this.logger.info("Deleting old calendar watcher entry from local DB: ", { entry: w });
                        await this.deleteGoogleCalendarWatcherDB(w);
                    }
                    res();
                } catch(err) {
                    rej("Error deleting old google calendar watch registration: " + err);
                }
            });
        });
    }

    private async registerNewCalendarWatcher(): Promise<CalendarWatcherWebHook> {
        this.logger.info("Creating new calendar update channel...");
        let serviceAccount = await getAuthenticatedServiceAccount();
        let nextChannelName = "monitoring-" + Math.round(new Date().getTime() / 1000);
        let watcher = await this.helper.installCalendarWatcher(serviceAccount, this.CALENDAR_ID, this.WEBHOOK_URL, nextChannelName);
        this.logger.info("Registered new calendar update channel with google!", { id: watcher.id, resourceId: watcher.resourceId, expiration: watcher.expiration });
        this.storeGoogleCalendarWatcherDB(watcher);
        return watcher;
    }


    // Database handling ----------------------------------------------------------------------

    async deleteGoogleCalendarWatcherDB(watcher: CalendarWatcherWebHook): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.sqlite.sqlUpdate({
                params: [watcher.id, watcher.resourceId],
                update: "DELETE FROM watches WHERE id=? AND resourceId=?"
            }).then(() => res()).catch(err => rej(err));
        });
    }

    async storeGoogleCalendarWatcherDB(watcher: CalendarWatcherWebHook): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.sqlite.sqlUpdate({
                params: [watcher.id, watcher.resourceId, watcher.channelName, watcher.expiration],
                update: "INSERT INTO watches(id, resourceId, channelName, expiration) VALUES (?, ?, ?, ?)"
            }).then(() => res()).catch(err => rej(err));
        });
    }

    async getAllGoogleCalendarWatchersDB(): Promise<CalendarWatcherWebHook[]> {
        return new Promise<CalendarWatcherWebHook[]>((res, rej) => {
            this.sqlite.sqlFetchAll("SELECT id,resourceId from watches", []).then(rows => {
                let watchers: CalendarWatcherWebHook[] = [];
                for (let row of rows) {
                    watchers.push({
                        id: row['id'],
                        resourceId: row['resourceId'],
                        channelName: row['channelName'],
                        expiration: row['expiration'],
                    });
                }
                res(watchers);
            }).catch(err => {
                rej(err);
            });
        });
    }
}