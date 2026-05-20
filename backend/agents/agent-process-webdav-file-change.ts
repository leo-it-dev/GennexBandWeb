import * as child_process from 'child_process';
import config from 'config';
import * as fs from 'fs';
import path from 'path';
import { getFilePathFrontend } from "..";
import * as webdav from '../framework/webdav-sync';
import { Agent } from "../modules/agent/agent";
import { AgentTriggerWebDavFileCreate, AgentTriggerWebDavFileModify } from "../modules/agent/agent_trigger";

export class AgentProcessWebDavFileChange extends Agent {

    // file paths on remote nextcloud
    NEXTCLOUD_SPOTIFY_PLAYLIST_FILE_PATH = config.get('SPOTIFY.NEXTCLOUD_UPLOAD_FILE_PATH') as string;
    NEXTCLOUD_UPLOAD_TEX_PATH = config.get('SPOTIFY.NEXTCLOUD_UPLOAD_TEX_PATH') as string;
    NEXTCLOUD_UPLOAD_PDF_OUT_PATH = (config.get('SPOTIFY.NEXTCLOUD_UPLOAD_TEX_PATH') as string).replace('.tex', '.pdf');

    // file paths on local file system copy
    LOCAL_TEX_FILE_PATH = "";
    LOCAL_SPOTIFY_PLAYLIST_TXT_FILE_PATH = "";
    LOCAL_TEX_WORK_DIR = "";
    LOCAL_TEX_WORK_DIR_TEX_FILE = "";
    LOCAL_PDF_OUT_PATH = "";

    PATH_DOCUMENTS_LOCAL_DOWNLOAD = getFilePathFrontend() + "/documents";

    constructor() {
        super([
            AgentTriggerWebDavFileCreate,
            AgentTriggerWebDavFileModify,
        ]);
    }

    name() {
        return "process-webdav-file-change"
    }

    initialize() {
        this.LOCAL_TEX_FILE_PATH = getFilePathFrontend() + "/documents/" + path.basename(this.NEXTCLOUD_UPLOAD_TEX_PATH);
        this.LOCAL_PDF_OUT_PATH = getFilePathFrontend() + "/tex_work/" + path.basename(this.LOCAL_TEX_FILE_PATH).replace(".tex", ".pdf");
        this.LOCAL_TEX_WORK_DIR = getFilePathFrontend() + "/tex_work";
        this.LOCAL_SPOTIFY_PLAYLIST_TXT_FILE_PATH = getFilePathFrontend() + "/tex_work/" + path.basename(this.NEXTCLOUD_SPOTIFY_PLAYLIST_FILE_PATH);
        this.LOCAL_TEX_WORK_DIR_TEX_FILE = getFilePathFrontend() + "/tex_work/" + path.basename(this.LOCAL_TEX_FILE_PATH);
    }

    /**
     * @param str String to escape for subprocess creation
     * @returns str with each single quote escaped
     */
    escape(str: string): string {
        return str.replace("'", "'\\''");
    }

    async triggeredBy(trigger: AgentTriggerWebDavFileCreate | AgentTriggerWebDavFileModify) {
        this.logger().info("WebDav agent got triggered by event: ", { trigger: trigger });

        if (trigger.filePaths.includes(this.NEXTCLOUD_SPOTIFY_PLAYLIST_FILE_PATH)
        || trigger.filePaths.includes(this.NEXTCLOUD_UPLOAD_TEX_PATH)) {
            // Recreate Setlist PDF
            this.prepareLatexBuildDirectory();
            this.spawnLatexSubprocess(this.LOCAL_TEX_WORK_DIR_TEX_FILE).then(() => {
                this.logger().info("We compiled a new spotify setlist pdf! Uploading...");

                let pdfOutBuffer = fs.readFileSync(this.LOCAL_PDF_OUT_PATH);
                webdav.uploadWebDavFile(this.NEXTCLOUD_UPLOAD_PDF_OUT_PATH, pdfOutBuffer).then(() => {
                    this.logger().info("Successfully uploaded new spotify playlist pdf to nextcloud!");
                }).catch(err => {
                    this.logger().error("Error uploading new spotify playlist pdf to nextcloud!", {error: err});
                }).finally(() => {
                    this.deleteLocalTempTexDir();
                    this.logger().info("Cleaned up temporary latex directory.");
                });
            }).catch(err => {
                this.logger().error("Error compiling a new spotify setlist pdf!", {error: err});
            });
        }
    }

    deleteLocalTempTexDir() {
        if (fs.existsSync(this.LOCAL_TEX_WORK_DIR)) {
            fs.rmSync(this.LOCAL_TEX_WORK_DIR, {
                recursive: true,
                force: true,
                maxRetries: 3,
                retryDelay: 1
            });
        }
    }

    prepareLatexBuildDirectory() {
        this.deleteLocalTempTexDir();
        fs.mkdirSync(this.LOCAL_TEX_WORK_DIR);

        // TODO: This crashes sometimes because of lazy load
        fs.cpSync(this.PATH_DOCUMENTS_LOCAL_DOWNLOAD, this.LOCAL_TEX_WORK_DIR, {
            force: true,
            recursive: true,
            errorOnExist: false
        });

        // preprocess latex spotify song list input (encode characters)
        let setlistContentIn = fs.readFileSync(this.LOCAL_SPOTIFY_PLAYLIST_TXT_FILE_PATH, 'utf-8');
        fs.writeFileSync(this.LOCAL_SPOTIFY_PLAYLIST_TXT_FILE_PATH, this.escapeLatex(setlistContentIn));
    }

    escapeLatex(input: string): string {
        const replacements: Record<string, string> = {
            '\\': '\\textbackslash{}',
            '{': '\\{',
            '}': '\\}',
            '$': '\\$',
            '&': '\\&',
            '%': '\\%',
            '#': '\\#',
            '_': '\\_',
            '^': '\\textasciicircum{}',
            '~': '\\textasciitilde{}',
        };
        return input.replace(/[\\{}$&%#_^~]/g, (char) => replacements[char]);
    }

    spawnLatexSubprocess(latexInFileName: string): Promise<void> {
        return new Promise<void>((res, rej) => {
            const command = 'cd "' + path.dirname(latexInFileName) + '" && pdflatex -halt-on-error "' + this.escape(path.basename(latexInFileName)) + '"';
            child_process.exec(command, (err: any, stdout: string, stderr: string) => {
                if (err) {
                    rej(err);
                } else {
                    if (stderr == '') {
                        res();
                    } else {
                        rej(stderr);
                    }
                }
            });
        });
    }
}