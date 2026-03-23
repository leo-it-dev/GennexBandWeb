import { getFilePathFrontend, getRepeatedScheduler } from "../..";
import { ApiInterfaceGalleryIn, ApiInterfaceGalleryOut } from "../../../api_common/gallery";
import { ApiModule } from "../../api_module";
import sharp = require('sharp');
import * as immich from '../../framework/immich_api';
import * as fs from 'fs';
import * as config from 'config';
import * as path from 'path';

export class ApiModuleGallery extends ApiModule {

    SYNCHRONIZE_INTERVAL_MINUTES = config.get('immich.SYNCHRONIZE_INTERVAL_MINUTES') as number;

    galleryFiles: string[] = [];
    urlPathBandpics = "/gallery"
    urlPathBandpicsThumbs = "/gallery/thumbs"
    filePathBandpics = "";
    filePathBandpicsThumbnails = "";

    async initialize() {
        this.filePathBandpics = getFilePathFrontend() + this.urlPathBandpics;
        this.filePathBandpicsThumbnails = getFilePathFrontend() + this.urlPathBandpicsThumbs;

        getRepeatedScheduler().scheduleRepeatedEvent(this, "gallery-sync", 60 * this.SYNCHRONIZE_INTERVAL_MINUTES, (finished) => {
            immich.syncGalleryWithImmich().then(syncResult => {

                let updatedGalleryFiles = [];
                fs.readdirSync(this.filePathBandpics).forEach(file => {
                    if (fs.lstatSync(this.filePathBandpics + "/" + file).isFile()) {
                        updatedGalleryFiles.push(file);
                    }
                });
                this.galleryFiles = updatedGalleryFiles;

                this.generateAssetThumbnails(this.filePathBandpics, this.filePathBandpicsThumbnails, syncResult, 1024).then(() => {
                    finished();
                });
            });
        }, true);
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

    async generateAssetThumbnails(sourceImagesPath: string, thumbnailFolderOut: string, assetSyncResult: immich.SyncGalleryResult, thumbnailImageWidth: number): Promise<void> {
        if (!fs.existsSync(thumbnailFolderOut)) {
            fs.mkdirSync(thumbnailFolderOut);
        }

        let thumbnailLogger = this.logger().child({ service: 'thumbnail-compressor' });
        thumbnailLogger.info("Starting image compression...");

        let filePaths = [];
        fs.readdirSync(sourceImagesPath).forEach(assetId => {
            let assetIdThumbnailPath = path.resolve(sourceImagesPath, assetId);
            if (fs.lstatSync(assetIdThumbnailPath).isFile()) {
                if (assetSyncResult.updateAssetsIDs.includes(assetId)) {
                    filePaths.push(assetIdThumbnailPath);
                    thumbnailLogger.info("Generating asset thumbnail!", { assetId: assetId });
                }
                else if (assetSyncResult.deleteAssetsIDs.includes(assetId)) {
                    fs.rmSync(assetIdThumbnailPath, { force: true, maxRetries: 3, recursive: false, retryDelay: 1 })
                    thumbnailLogger.info("Deleting asset thumbnail!", { assetId: assetId });
                }
            }
        });

        await Promise.all(filePaths.map(async file => {
            let basename: string = path.basename(file);
            let sepIdx = basename.lastIndexOf(".");
            let stem = sepIdx != -1 ? basename.substring(0, sepIdx) : basename;
            let compressedImageName = stem + ".webp";

            await sharp(file)
                .resize(thumbnailImageWidth)
                .webp({ quality: 70 })
                .toFile(thumbnailFolderOut + '/' + compressedImageName);
        }));
        thumbnailLogger.info("Finished image compression!");
    }
}