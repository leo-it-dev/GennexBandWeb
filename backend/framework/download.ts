import * as fs from "fs";
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import * as path from 'path';
import { ReadableStream } from "stream/web";
import { getLogger } from "../logger";

const logger = getLogger("file-downloader");

export async function downloadFile(url, fileName, outputDir): Promise<void> {
    return new Promise(async (res, rej) => {
        const destination = path.resolve(outputDir, fileName);
        if (fs.existsSync(destination)) {
            fs.unlinkSync(destination);
        }

        const response = await fetch(url);

        // this currently only works for google drive downloads!
        // if the file to download is not publically available we get redirected to accounts.google.com
        // we need to detect that in order to raise some download error. Otherwise we get a completely empty output file.
        let requestSucceeded = response.ok && !response.url.includes("accounts.google.com") && !response.url.includes("signin")

        if (requestSucceeded) {
            const fileStream = fs.createWriteStream(destination, { flags: 'wx' });
            await finished(Readable.fromWeb(response.body as ReadableStream<any>).pipe(fileStream));
            logger.info("Successfully downloaded file!", {fileUrl: url.toString(), fileName: fileName, outputDir: outputDir});
            res();
        } else {
            logger.error("Error downloading file! Check file access permissions!", {fileUrl: url.toString(), fileName: fileName, outputDir: outputDir});
            rej("Error downloading file! Check public file access permissions!");
        }
    });
};