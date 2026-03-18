import { getFilePathFrontend } from "../..";
import { ApiInterfaceGalleryIn, ApiInterfaceGalleryOut } from "../../../api_common/gallery";
import { ApiModule } from "../../api_module";
import sharp = require('sharp');

const fs = require('fs');
const path = require('path');

export class ApiModuleGallery extends ApiModule {

    galleryFiles: string[];
    urlPathBandpics = "/images/bandpic"
    urlPathBandpicsThumbs = "/images/bandpic/thumbs"
    filePathBandpics = "";
    filePathBandpicsThumbnails = "";

    initialize() {
        this.galleryFiles = [];
        this.filePathBandpics = getFilePathFrontend() + this.urlPathBandpics;
        this.filePathBandpicsThumbnails = getFilePathFrontend() + this.urlPathBandpicsThumbs;

        fs.readdirSync(this.filePathBandpics).forEach(file => {
            if (fs.lstatSync(this.filePathBandpics + "/" + file).isFile()) {
                this.galleryFiles.push(file);
            }
        });

        this.generateBandpicThumbnails(this.filePathBandpics, this.filePathBandpicsThumbnails, 1024).then(() => {
            // done.
        });

    }

    modname(): string {
        return "gallery";
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceGalleryIn, ApiInterfaceGalleryOut>("gallery", async req => {
            return {
                statusCode: 200,
                error: undefined,
                responseObject: {
                    files: this.galleryFiles,
                    thumbnails: this.urlPathBandpicsThumbs,
                    big: this.urlPathBandpics,
                    thumbnailFormat: "webp"
                }
            }
        });
    }

    async generateBandpicThumbnails(sourceImagesPath: string, thumbnailFolderOut: string, thumbnailImageWidth: number): Promise<void> {
        if (!fs.existsSync(thumbnailFolderOut)) {
            fs.mkdirSync(thumbnailFolderOut);
        }
        let thumbnailLogger = this.logger().child({ service: 'thumbnail-compressor' });
        thumbnailLogger.info("Starting image compression...");
        let filePaths = [];
        fs.readdirSync(sourceImagesPath).forEach(file => {
            let abspath = sourceImagesPath + "/" + file;
            if (fs.lstatSync(abspath).isFile()) {
                filePaths.push(abspath);
            }
        });

        return new Promise<void>(async (res, _) => {
            for (let file of filePaths) {
                let basename: string = path.basename(file);
                let sepIdx = basename.lastIndexOf(".");
                let stem = basename.substring(0, sepIdx);
                let compressedImageName = stem + ".webp";

                thumbnailLogger.info("Compressing image " + file + "...");
                await sharp(file)
                    .resize(thumbnailImageWidth)
                    .webp({ quality: 70 })
                    .toFile(thumbnailFolderOut + '/' + compressedImageName);
            }
            thumbnailLogger.info("Finished image compression!");
            res();
        });
    }
}