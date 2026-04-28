import config from 'config';
import * as fs from 'fs';
import { getFilePathFrontend, getRepeatedScheduler } from "../..";
import { ApiInterfaceGalleryIn, ApiInterfaceGalleryOut } from "../../../api_common/gallery";
import { ApiModule } from "../../api_module";
import * as immich from '../../framework/immich_api';

export class ApiModuleGallery extends ApiModule {

    SYNCHRONIZE_INTERVAL_MINUTES = config.get('immich.SYNCHRONIZE_INTERVAL_MINUTES') as number;

    galleryFiles: string[] = [];
    urlPathBandpics = "/gallery"
    urlPathBandpicsThumbs = "/gallery/thumbs"
    filePathBandpics = "";
    filePathBandpicsThumbnails = "";

    galleryAlbum!: immich.SyncableAlbum;

    async initialize() {
        this.filePathBandpics = getFilePathFrontend() + this.urlPathBandpics;
        this.filePathBandpicsThumbnails = getFilePathFrontend() + this.urlPathBandpicsThumbs;

        this.galleryAlbum = immich.registerImmichAlbumSynch(config.get('immich.GALLERY_ALBUM') as string, this.urlPathBandpics);

        getRepeatedScheduler().scheduleRepeatedEvent(this, "gallery-sync", 60 * this.SYNCHRONIZE_INTERVAL_MINUTES, (finished) => {
            immich.syncWithImmich(this.galleryAlbum).then(syncResult => {

                let updatedGalleryFiles: string[] = [];
                fs.readdirSync(this.filePathBandpics).forEach(file => {
                    if (fs.lstatSync(this.filePathBandpics + "/" + file).isFile()) {
                        updatedGalleryFiles.push(file);
                    }
                });
                this.galleryFiles = updatedGalleryFiles;

                immich.generateAssetThumbnails(this.filePathBandpics, this.filePathBandpicsThumbnails, syncResult, 1024).then(() => {
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
}