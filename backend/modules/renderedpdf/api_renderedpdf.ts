import { getFilePathFrontend } from "../..";
import { ApiInterfaceRenderedPDFsIn, ApiInterfaceRenderedPDFsOut, RenderedPDF } from "../../../api_common/rendered_pdfs";
import { ApiModule } from "../../api_module";
import * as fs from 'fs';
import { downloadFile } from "../../framework/download";
import path = require("path");
import { fromPath } from "pdf2pic";
import { Options } from "pdf2pic/dist/types/options";
import * as crypto from 'crypto';

export class ApiModuleRenderedPDFs extends ApiModule {

    pathPdfsInBase = "/pdfs";
    pathPdfsIn = "";
    pathPdfsOutBase = "/pdfs/render";
    pathPdfsOut = "";
    RENDER_PDF_WIDTH = 1000;

    renderedPDFs: RenderedPDF[] = [];

    initialize() {
        this.pathPdfsIn = getFilePathFrontend() + this.pathPdfsInBase;
        this.pathPdfsOut = getFilePathFrontend() + this.pathPdfsOutBase;

        if (!fs.existsSync(this.pathPdfsIn)) {
            fs.mkdirSync(this.pathPdfsIn);
        }
        if (!fs.existsSync(this.pathPdfsOut)) {
            fs.mkdirSync(this.pathPdfsOut);
        }

    }

    modname(): string {
        return "renderedpdf";
    }

    hashSourceUrl(sourceUrl: string) {
        return crypto.createHash('sha256').update(sourceUrl).digest('hex');
    }

    /**
     * downloads a pdf and renders each page as a png.
     * converted pages have the following path spec:  <saveFilename>.<page>.png
     */
    async renderPdfToPngs(urlStr: string, fileName: string): Promise<string> {
        return new Promise<string>(async (res, rej) => {
            try {
                // convert urls to be downloadable. E.g. convert a google drive file link to a download link.
                let fixedUrl = this.convertPdfPathToDownloadable(urlStr);
                let outputPathBase = path.resolve(this.pathPdfsOut, fileName);
                let sourceUrlHash = this.hashSourceUrl(urlStr);
                let pdfOutputName = sourceUrlHash + ".pdf";
                let pdfRenderOutputFolder = path.resolve(this.pathPdfsOut, sourceUrlHash);

                // download the pdf file locally for conversion.
                await downloadFile(fixedUrl.toString(), pdfOutputName, this.pathPdfsIn);

                const options: Options = {
                    density: 100,
                    savePath: pdfRenderOutputFolder,
                    saveFilename: "page",
                    format: 'png',
                    preserveAspectRatio: true,
                    width: this.RENDER_PDF_WIDTH,
                };

                if (!fs.existsSync(pdfRenderOutputFolder)) {
                    fs.mkdirSync(pdfRenderOutputFolder);
                }

                let pages = await fromPath(path.resolve(this.pathPdfsIn, pdfOutputName), options).bulk(
                    -1, // -1 to convert all pages of pdf to image
                    {
                        responseType: 'image'
                    }
                );

                this.renderedPDFs = this.renderedPDFs.filter(pdf => pdf.sourceURL != urlStr)
                this.renderedPDFs.push({
                    sourceURL: urlStr,
                    pagePngURLs: Array.from(new Array(pages.length)).map((p, idx) => this.pathPdfsOutBase + "/" + sourceUrlHash + "/page." + (idx+1) + ".png")
                });

                res(outputPathBase);
            } catch (error) {
                rej(error);
            }
        });
    }

    async publishImage(urlStr: string, fileName: string): Promise<string> {
        return new Promise<string>(async (res, rej) => {
            try {
                // convert urls to be downloadable. E.g. convert a google drive file link to a download link.
                let fixedUrl = this.convertPdfPathToDownloadable(urlStr);
                let outputPathBase = path.resolve(this.pathPdfsOut, fileName);
                let sourceUrlHash = this.hashSourceUrl(urlStr);

                // download the pdf file locally for conversion.
                await downloadFile(fixedUrl.toString(), sourceUrlHash, this.pathPdfsIn);

                this.renderedPDFs = this.renderedPDFs.filter(pdf => pdf.sourceURL != urlStr)
                this.renderedPDFs.push({
                    sourceURL: urlStr,
                    pagePngURLs: Array.from(new Array(1)).map((p) => this.pathPdfsInBase + "/" + sourceUrlHash)
                });

                res(outputPathBase);
            } catch (error) {
                rej(error);
            }
        });
    }

    convertPdfPathToDownloadable(urlStr: string): URL {
        let url = new URL(urlStr);
        switch (url.host) {
            case "drive.google.com":
                // transform: // https://drive.google.com/file/d/<file>/view?usp=drivesdk to https://drive.google.com/uc?export=download&id=<file>
                if (url.pathname.toLowerCase().endsWith("/view")) {
                    let fileId = url.pathname.split("\/d\/")[1].split("/view")[0];
                    url.pathname = "/uc"
                    url.search = "?export=download&id=" + fileId;
                }
                break;
        }
        return url;
    }

    registerEndpoints(): void {
        this.postJson<ApiInterfaceRenderedPDFsIn, ApiInterfaceRenderedPDFsOut>("list", async req => {
            return {
                statusCode: 200,
                error: undefined,
                responseObject: {
                    renderedPDFs: this.renderedPDFs
                }
            }
        });
    }
}
