import config from 'config';
import * as webdav from 'webdav';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { getLogger } from '../logger';
import { runAgentTrigger } from '..';
import { AgentTriggerWebDavFileCreate, AgentTriggerWebDavFileDelete, AgentTriggerWebDavFileModify } from '../modules/agent/agent_trigger';

let webdavClient!: webdav.WebDAVClient;
const nextcloudPath = config.get('nextcloud.NEXTCLOUD_BASE_URL') as string;

const logger = getLogger('webdav-sync');

export type WebDavSnychronization = {
    outputDirectory: string,
    inputPath: string
}

export type NextcloudFileChangeWebhookRegister = {
    httpMethod: string,
    uri: string,
    event: string
}

export type NextcloudWebhook = {
    id: number,
    userid: string,
    httpMethod: string,
    uri: string,
    event: string,
    eventFilter: object
    parsedPath: string
}

export interface WebDavFile {
    filename: string;
    basename: string;
    lastmod: Date;
    size: number;
    type: "file" | "directory";
}

export function init() {
    webdavClient = webdav.createClient(
        config.get('nextcloud.WEBDAV_URL'),
        {
            username: config.get('nextcloud.USERNAME'),
            password: config.get('nextcloud.PASSWORD')
        }
    );
}

export function listAllFileSystemWebhooks(): Promise<NextcloudWebhook[]> {
    return new Promise<NextcloudWebhook[]>((resolve, rej) => {
        let webhooks: NextcloudWebhook[] = [];

        fetch(nextcloudPath + "/ocs/v2.php/apps/webhook_listeners/api/v1/webhooks", {
            method: 'GET',
            headers: {
                'OCS-APIRequest': 'true',
                'Authorization': 'Basic ' + btoa(config.get('nextcloud.USERNAME') + ":" + config.get('nextcloud.PASSWORD'))
            }
        }).then(d => d.text()).then(d => {
            xml2js.parseString(d, (err, res) => {
                if (err) {
                    throw Error(err.message);
                }

                if (Object.keys(res.ocs.data[0]).includes('element')) {
                    for (let el of res.ocs.data[0].element) {
                        let id = el.id[0];
                        let userId = el.userId[0];
                        let httpMethod = el.httpMethod[0];
                        let uri = el.uri[0];
                        let event = el.event[0];
                        let eventFilter = el.eventFilter;

                        let pathFilter = (eventFilter as object[]).find(ef => (Object.keys(ef)).includes('node.path')) as any;
                        let path = pathFilter !== undefined ? pathFilter['node.path'][0] : undefined;
                        webhooks.push({
                            event: event,
                            eventFilter: eventFilter,
                            httpMethod: httpMethod,
                            id: id,
                            parsedPath: path,
                            uri: uri,
                            userid: userId
                        });
                    }
                }

                resolve(webhooks);
            });
        }).catch(err => {
            rej(err);
        });
    });
}

export function deleteWebhook(hook: NextcloudWebhook) {
    return new Promise<void>((res, rej) => {
        fetch(nextcloudPath + "/ocs/v2.php/apps/webhook_listeners/api/v1/webhooks/" + hook.id, {
            method: 'DELETE',
            headers: {
                'OCS-APIRequest': 'true',
                'Authorization': 'Basic ' + btoa(config.get('nextcloud.USERNAME') + ":" + config.get('nextcloud.PASSWORD'))
            }
        }).then(d => {
            if (d.ok) {
                res();
            }
            else {
                rej(d.statusText);
            }
        }).catch(err => {
            rej(err);
        });
    });
}

export function registerNewWebhook(hook: NextcloudFileChangeWebhookRegister) {
    return new Promise<void>((res, rej) => {
        fetch(nextcloudPath + "/ocs/v2.php/apps/webhook_listeners/api/v1/webhooks", {
            method: 'POST',
            headers: {
                'OCS-APIRequest': 'true',
                'Authorization': 'Basic ' + btoa(config.get('nextcloud.USERNAME') + ":" + config.get('nextcloud.PASSWORD')),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uri: hook.uri,
                httpMethod: hook.httpMethod,
                event: hook.event
            })
        }).then(d => {
            if (d.ok) {
                res();
            }
            else {
                rej(d.statusText);
            }
        }).catch(err => {
            rej(err);
        });
    });
}

export function listWebdavFiles(folderPath: string): Promise<WebDavFile[]> {
    return new Promise<WebDavFile[]>((res, rej) => {
        webdavClient.getDirectoryContents(folderPath).then(files => {
            res(files.map(f => {
                return {
                    basename: f.basename,
                    filename: f.filename,
                    lastmod: new Date(f.lastmod),
                    size: f.size,
                    type: f.type
                } as WebDavFile;
            }));
        }).catch(err => {
            rej(err);
        });
    });
}

export function downloadWebDavFile(filePath: string, destinationFile: string): Promise<void> {
    return new Promise<void>((res, rej) => {
        webdavClient.getFileContents(filePath, {
            format: 'binary'
        }).then(async dat => {
            let buffer = dat as Buffer;

            const writeStream = fs.createWriteStream(destinationFile, { flags: 'w' })
            await pipeline(Readable.from(buffer), writeStream);

            res();

        }).catch(err => {
            rej(err);
        })
    });
}

export async function snychronizeWebDavFolder(synchro: WebDavSnychronization): Promise<void> {
    logger.info("Starting synchronization of webdav folder!", {input: synchro.inputPath, output: synchro.outputDirectory});
    return new Promise<void>((res, rej) => {
        if (!fs.existsSync(synchro.outputDirectory)) {
            fs.mkdirSync(synchro.outputDirectory);
        }
    
        let localFiles = fs.readdirSync(synchro.outputDirectory);
        let remoteFiles: string[] = [];
    
        listWebdavFiles(synchro.inputPath).then(async files => {
            let createLocalFiles: string[] = [];
            let modifyLocalFiles: string[] = [];

            for (let file of files) {
                if (file.type != 'file') {
                    continue;
                }

                remoteFiles.push(file.basename);

                let localFile = path.join(synchro.outputDirectory, file.basename);
                if (fs.existsSync(localFile)) {
                    let localStat = fs.statSync(localFile);
                    if (localStat.mtime.getTime() == file.lastmod.getTime() && localStat.size == file.size) {
                        logger.info("File has same size and mod date. Skipping redownload as it's propably the same.", { path: file.filename, size: file.size, mtime: file.lastmod.getTime() })
                        continue;
                    } else {
                        modifyLocalFiles.push(file.filename);
                    }
                } else {
                    createLocalFiles.push(file.filename);
                }

                await (downloadWebDavFile(file.filename, localFile).then(() => {
                    fs.utimesSync(localFile, file.lastmod, file.lastmod);
                    logger.info("Successfully downloaded webdav document", { path: file.filename, size: file.size, mtime: file.lastmod.getTime() })
                }).catch(err => {
                    logger.error("Error downloading webdav document!", { path: file.filename, size: file.size, mtime: file.lastmod.getTime(), error: err })
                }));
            }
    
            let deleteLocalFiles = localFiles.filter(f => !remoteFiles.includes(f)).map(f => path.join(synchro.outputDirectory, f));
            for (let deleteFile of deleteLocalFiles) {
                fs.rmSync(deleteFile, {
                    force: true
                })
                logger.info("Removed local copy of deleted remote webdav file!", { filename: deleteFile })
            }

            if (deleteLocalFiles.length > 0) await runAgentTrigger(new AgentTriggerWebDavFileDelete(deleteLocalFiles));
            if (createLocalFiles.length > 0) await runAgentTrigger(new AgentTriggerWebDavFileCreate(createLocalFiles));
            if (modifyLocalFiles.length > 0) await runAgentTrigger(new AgentTriggerWebDavFileModify(modifyLocalFiles));
        }).catch(err => {
            logger.error("Unhandled error occured during webdav file download!", { error: err })
        }).finally(() => {
            logger.info("Finished synchronization of webdav folder!", {input: synchro.inputPath, output: synchro.outputDirectory});
            res();
        });
    });
}

export async function uploadWebDavFile(pathDestination: string, body: Buffer | string): Promise<void> {
    return new Promise<void>((res, rej) => {
        webdavClient.putFileContents(pathDestination, body, {
            contentLength: body.length,
            overwrite: true
        }).then(_ => {
            res();
        }).catch(err => {
            rej(err);
        });
    });
}