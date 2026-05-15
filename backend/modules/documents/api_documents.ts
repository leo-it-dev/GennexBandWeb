import config from 'config';
import { getBaseURL, getFilePathFrontend } from '../..';
import { ApiInterfaceEmptyIn, ApiInterfaceEmptyOut } from '../../../api_common/backend_call';
import { ApiInterfaceDocumentsOut, DownloadableDocument, ForwardLink } from '../../../api_common/documents';
import { ApiModule } from "../../api_module";
import * as webdav from '../../framework/webdav-sync';
import * as fs from 'fs';
import { Watchdog } from '../../utils/watchdog';
import * as path from 'path';

export class ApiModuleDocuments extends ApiModule {

    private SYNC_PATH = config.get('nextcloud.SYNC_PATH') as string;
    private LINK_FILE = config.get('nextcloud.FORWARD_LINK_FILE') as string;

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

    modname(): string {
        return "documents";
    }

    async initialize() {
        webdav.listAllFileSystemWebhooks().then(async hooks => {
            for(let hook of hooks) {
                await webdav.deleteWebhook(hook)
            }

            this.listenToNodeEvents.forEach(event => {
                webdav.registerNewWebhook({
                    event: 'OCP\\Files\\Events\\Node\\' + event,
                    httpMethod: 'GET',
                    uri: this.WEBHOOK_URL,
                });
            });
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
                outputDirectory: this.pathOutputDocuments
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

        for(let doc of fs.readdirSync(this.pathOutputDocuments)) {
            let fullPath = path.join(this.pathOutputDocuments, doc);
            if (doc.toLowerCase() == this.LINK_FILE.toLowerCase()) {
                let content = fs.readFileSync(fullPath, 'utf-8');
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
            } else {
                let stat = fs.statSync(fullPath);
                documents.push({
                    name: doc,
                    size: stat.size,
                    url: getBaseURL() + "documents/" + encodeURIComponent(doc)
                });
            }
        }

        return {documents: documents, links: links};
    }
}