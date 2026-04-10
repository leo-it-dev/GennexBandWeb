import { getBaseURL } from "../..";
import { getAuthenticatedServiceAccount, ServiceAccountAccess } from "../../framework/service-account";
import { SQLiteDB } from "../../framework/sqlite_database";
import { getLogger } from "../../logger";
import { CalendarAPIHelper, CalendarWatcherWebHook } from "./calendar_helper";
import config from 'config';

export class GoogleCalendarWatchHandler {

    private logger = getLogger("google-calendar-watcher")
    private CALENDAR_ID = config.get('calendar.CALENDAR_ID') as string;
    private WEBHOOK_URL = getBaseURL() + "module/calendar/" + this.getWebhookListenEndpoint()
    private ACTIVE_CHANNEL_NAME?: string = undefined;
    private watcherRefreshTimeoutId?: NodeJS.Timeout;
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
        this.registerNewCalendarWatcher().then((hook) => this.handleNewlyRegisteredWatcher(hook)).catch(err => {
            this.logger.error("Error registering google calendar push notification handler, but error an occurred!", {error: err})
        });
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
            this.registerNewCalendarWatcher().then((watcher) => this.handleNewlyRegisteredWatcher(watcher)).catch(err => {
                this.logger.error("Error registering google calendar push notification handler, but error an occurred!", {error: err})
            });
        }, 1000 * (Math.round(timeoutToExpiration / 1000) - this.SECONDS_TO_RENEW_WATCHER_BEFORE_TIMEOUT));
    }

    private async deleteOldWatcherRegistrations() {
        return new Promise<void>(async (res, rej) => {
            try {
                let watchers = this.getAllGoogleCalendarWatchersDB();
                let serviceAccount = await getAuthenticatedServiceAccount();
                if (serviceAccount) {
                    for (let w of watchers) {
                        this.logger.info("Unregistering old calendar watcher entry from google: ", { entry: w });
                        await this.helper.deleteCalendarWatcher(serviceAccount, w);
                        this.logger.info("Deleting old calendar watcher entry from local DB: ", { entry: w });
                        this.deleteGoogleCalendarWatcherDB(w);
                    }
                    res();
                } else {
                    throw Error("Could not acquire service acount!");
                }
            } catch(err) {
                rej("Error deleting old google calendar watch registration: " + err);
            }
        });
    }

    private async registerNewCalendarWatcher(): Promise<CalendarWatcherWebHook> {
        return new Promise<CalendarWatcherWebHook>(async (res, rej) => {
            this.logger.info("Creating new calendar update channel...");
            let serviceAccount = await getAuthenticatedServiceAccount();
            if (serviceAccount) {
                let nextChannelName = "monitoring-" + Math.round(new Date().getTime() / 1000);
                let watcher = await this.helper.installCalendarWatcher(serviceAccount, this.CALENDAR_ID, this.WEBHOOK_URL, nextChannelName);
                this.logger.info("Registered new calendar update channel with google!", { id: watcher.id, resourceId: watcher.resourceId, expiration: watcher.expiration });
                this.storeGoogleCalendarWatcherDB(watcher);
                res(watcher);
            } else {
                this.logger.error("Error registering new calendar watcher with google!", { error: "Error acquiring service account!" });
                rej("Error acquiring service account access!");
            }
        });
    }


    // Database handling ----------------------------------------------------------------------

    deleteGoogleCalendarWatcherDB(watcher: CalendarWatcherWebHook) {
        this.sqlite.sqlUpdate({
            params: [watcher.id, watcher.resourceId],
            update: "DELETE FROM watches WHERE id=? AND resourceId=?"
        });
    }

    storeGoogleCalendarWatcherDB(watcher: CalendarWatcherWebHook) {
        this.sqlite.sqlUpdate({
            params: [watcher.id, watcher.resourceId, watcher.channelName, watcher.expiration],
            update: "INSERT INTO watches(id, resourceId, channelName, expiration) VALUES (?, ?, ?, ?)"
        });
    }

    getAllGoogleCalendarWatchersDB(): CalendarWatcherWebHook[] {
        let rows = this.sqlite.sqlFetchAll("SELECT id,resourceId from watches", []);
        let watchers: CalendarWatcherWebHook[] = [];
        for (let row of rows) {
            watchers.push({
                id: row['id'],
                resourceId: row['resourceId'],
                channelName: row['channelName'],
                expiration: row['expiration'],
            });
        }
        return watchers;
    }
}