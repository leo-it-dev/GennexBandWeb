import config from 'config';
import { getBaseURL, getFilePathFrontend, getRepeatedScheduler } from '../..';
import { ApiInterfaceEmptyIn, ApiInterfaceEmptyOut } from '../../../api_common/backend_call';
import { ApiInterfaceDocumentsOut, DownloadableDocument, ForwardLink } from '../../../api_common/documents';
import { ApiModule } from "../../api_module";
import * as webdav from '../../framework/webdav-sync';
import * as fs from 'fs';
import { Watchdog } from '../../utils/watchdog';
import * as path from 'path';
import * as spotify from '../../framework/spotify_scraper';

export class ApiModuleDocuments extends ApiModule {

    private SYNC_PATH = config.get('nextcloud.SYNC_PATH') as string;
    private LINK_FILE = config.get('nextcloud.FORWARD_LINK_FILE') as string;
    private DOWNLOAD_FILE = config.get('nextcloud.EMBED_DOWNLOAD_FILE') as string;
    private SPOTIFY_SYNC_INTERVAL_SECS = config.get('SPOTIFY.SYNC_INTERVAL_SECONDS') as number;
    private SPOTIFY_PLAYLIST_ID = config.get('SPOTIFY.PLAYLIST_ID') as string;
    private SPOTIFY_UPLOAD_TEMP_FILE = config.get('SPOTIFY.NEXTCLOUD_UPLOAD_FILE_PATH') as string;

    private SYNC_DOCUMENTS_WEBHOOK_DELAY = 5;
    private preventRepeatedTriggerWatchdog = new Watchdog(() => this.processWebhookTrigger(), this.SYNC_DOCUMENTS_WEBHOOK_DELAY * 1000);
    private pathOutputDocuments = getFilePathFrontend() + "/documents"

    private WEBHOOK_URL = getBaseURL() + "module/documents/" + this.getWebhookListenEndpoint()
    private listenToNodeEvents = [
        "NodeCopiedEvent",
        "NodeCreatedEvent",
        "NodeDeletedEvent",
        "NodeRenamedEvent",
        "NodeTouchedEvent",
        "NodeWrittenEvent"
    ];

    private downloadableDocuments: DownloadableDocument[] = [];
    private links: ForwardLink[] = [];

    public getWebhookListenEndpoint() {
        return "web-hook";
    }

    public getDocumentsDownloadFolder() {
        return this.pathOutputDocuments;
    }

    modname(): string {
        return "documents";
    }

    async initialize() {
        webdav.listAllFileSystemWebhooks().then(async hooks => {
            for(let hook of hooks) {
                await webdav.deleteWebhook(hook)
            }

            for(let event of this.listenToNodeEvents) {
                await webdav.registerNewWebhook({
                    event: 'OCP\\Files\\Events\\Node\\' + event,
                    httpMethod: 'GET',
                    uri: this.WEBHOOK_URL,
                });
            }

            getRepeatedScheduler().scheduleRepeatedEvent(this, "scrape-spotify", this.SPOTIFY_SYNC_INTERVAL_SECS, (finished) => {
                spotify.scrapeSongsFromPublicPlaylist(this.SPOTIFY_PLAYLIST_ID).then(songs => {
                    this.logger().info("Successfully scraped our own spotify playlist. Uploading intermediate setlist as txt file to nextcloud", {songCount: songs.length});
                    webdav.uploadWebDavFile(this.SPOTIFY_UPLOAD_TEMP_FILE, songs.join('\r\n'))
                }).then(d => {
                    this.logger().info("Successfully uploaded intermediate setlist as txt file to nextcloud!");
                }).catch(err => {
                    this.logger().error("Error uploading intermediate setlist as txt file to nextcloud!");
                }).finally(() => {
                    finished();
                });
            }, true);
        });

        await this.processWebhookTrigger();
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceEmptyIn, ApiInterfaceEmptyOut>(this.getWebhookListenEndpoint(), async req => {
            this.preventRepeatedTriggerWatchdog.kick();
            return {
                error: undefined,
                responseObject: {},
                statusCode: 200
            }
        });

        this.get<ApiInterfaceEmptyIn, ApiInterfaceDocumentsOut>("documents", async req => {
            return {
                error: undefined,
                responseObject: {
                    documents: this.downloadableDocuments,
                    links: this.links
                },
                statusCode: 200
            }
        });
    }

    processWebhookTrigger(): Promise<void> {
        return new Promise<void>((res, rej) => {
            this.logger().info("Processing webdav sync of document folder...");
            webdav.snychronizeWebDavFolder({
                inputPath: this.SYNC_PATH,
                outputDirectory: this.getDocumentsDownloadFolder()
            }).then(() => {
                this.logger().info("Successfully finished sync of document folder!");
            }).catch(() => {
                this.logger().error("Error synchronizing document folder!");
            }).finally(() => {
                let downloadData = this.getLocalDownloadableDocuments()
                this.downloadableDocuments = downloadData.documents;
                this.links = downloadData.links;
                res();
            });
       });
    }

    getLocalDownloadableDocuments(): {documents: DownloadableDocument[], links: ForwardLink[]} {
        let documents: DownloadableDocument[] = [];
        let links: ForwardLink[] = [];

        let linkFileFullPath = path.join(this.getDocumentsDownloadFolder(), this.LINK_FILE);
        let downloadFileFullPath = path.join(this.getDocumentsDownloadFolder(), this.DOWNLOAD_FILE);

        if (fs.existsSync(linkFileFullPath)) {
            let content = fs.readFileSync(linkFileFullPath, 'utf-8');
            let lines = content.split("\n").map(l => l.trim());
            for (let line of lines) {
                if (line.split("->").length == 2) {
                    let linkName = line.split("->")[0].trim()
                    let linkUrl = line.split("->")[1].trim();
                    links.push({
                        name: linkName,
                        url: linkUrl
                    });
                }
            }
        }
        if(fs.existsSync(downloadFileFullPath)) {
            let content = fs.readFileSync(downloadFileFullPath, 'utf-8');
            let lines = content.split("\n").map(l => l.trim());
            for (let line of lines) {
                if (line.split("->").length == 2) {
                    let downloadName = line.split("->")[0].trim()
                    let downloadFile = line.split("->")[1].trim();
                    let downloadFileFullPath = path.join(this.getDocumentsDownloadFolder(), downloadFile);

                    if (fs.existsSync(downloadFileFullPath)) {
                        let stat = fs.statSync(downloadFileFullPath);
                        documents.push({
                            name: downloadName,
                            size: stat.size,
                            url: getBaseURL() + "documents/" + encodeURIComponent(downloadFile)
                        });
                    }
                }
            }
        }
        return {documents: documents, links: links};
    }
}