import * as config from 'config';
import * as immich from "@immich/sdk";
import * as fs from 'fs';
import { getFilePathFrontend } from '..';
import { getLogger } from '../logger';
import path = require('path');
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const IMMICH_API_KEY = config.get('immich.API_KEY') as string;
const IMMICH_API_URL = config.get('immich.API_URL') as string;
const IMMICH_GALLERY_NAME = config.get('immich.GALLERY_ALBUM') as string;

export type CachedPictureInfo = {
    modifiedAt: Date,
    id: string
}

export type SyncGalleryResult = {
    updateAssetsIDs: string[],
    deleteAssetsIDs: string[]
}

// TODO: Periodic update, check if new assets are available.

const logger = getLogger("immich-api-handler");

let pathImages = "/gallery";

export function initImmich() {
    immich.init({ baseUrl: IMMICH_API_URL + "/api", apiKey: IMMICH_API_KEY });
    pathImages = getFilePathFrontend() + pathImages;
    if (!fs.existsSync(pathImages)) {
        fs.mkdirSync(pathImages);
    }

    logger.info("Clearing image file directory!");
}

function readLocalGalleryAssets(): CachedPictureInfo[] {
    if (!fs.existsSync(pathImages)) {
        fs.mkdirSync(pathImages);
    }

    let cachedPictureInfo: CachedPictureInfo[] = [];
    for (let assetId of fs.readdirSync(pathImages)) {
        let assetImagePath = path.resolve(pathImages, assetId);
        if (fs.lstatSync(assetImagePath).isFile()) {
            let modifiedAt = fs.statSync(assetImagePath).mtime;
            cachedPictureInfo.push({
                id: assetId,
                modifiedAt: modifiedAt
            })
        }
    }
    return cachedPictureInfo;
}

async function getGalleryAlbum(): Promise<immich.AlbumResponseDto> {
    const albums = await immich.getAllAlbums({});
    const galleries = albums.find(a => a.albumName.toLowerCase() == IMMICH_GALLERY_NAME.toLowerCase())

    if (!galleries) {
        logger.error("Can't find specified album for gallery!", { albumName: IMMICH_GALLERY_NAME });
    }

    const gallery = await immich.getAlbumInfo({
        id: galleries.id
    })

    return gallery ? gallery : undefined;
}

export async function syncGalleryWithImmich(): Promise<SyncGalleryResult> {
    // load gallery information with metadata about all entries.
    let gallery = await getGalleryAlbum();
    let localGallery = readLocalGalleryAssets();

    // filter for assets that we need to redownload (either new or modified newer than our copy).
    let assetIDsToDownload = gallery.assets.filter(asset => !localGallery.find(cached => cached.id == asset.id && cached.modifiedAt.getTime() == new Date(asset.fileModifiedAt).getTime())).map(a => a.id)
    // filter for assets that we need to delete as they no longer are stored inside the immich album.
    let assetIDsToDelete = localGallery.filter(cached => !gallery.assets.find(asset => asset.id == cached.id)).map(a => a.id);

    try {
        // we need to call getDownloadInfo in order to get an id we can then use to download all files.
        const downloadInfo = await immich.getDownloadInfo({
            downloadInfoDto: {
                assetIds: gallery.assets.filter(
                    asset => assetIDsToDownload.includes(asset.id)
                        && !assetIDsToDelete.includes(asset.id))
                    .map(asset => asset.id)
            }
        });

        if (assetIDsToDownload.length > 0) {
            // Asynchronously download all new assets from immich to our local gallery.
            await Promise.all(downloadInfo.archives[0].assetIds.map(async (assetId) => {
                let assetURL = IMMICH_API_URL + "/api/assets/" + assetId + "/original?apiKey=" + IMMICH_API_KEY;
                let content = await fetch(assetURL);
                const imageOutFile = path.resolve(pathImages, assetId);
                const writeStream = fs.createWriteStream(imageOutFile, { flags: 'wx' })
                await pipeline(Readable.fromWeb(content.body as any), writeStream);

                let modifiedAtOnImmich = new Date(gallery.assets.find(a => a.id == assetId).fileModifiedAt);
                fs.utimesSync(imageOutFile, modifiedAtOnImmich, modifiedAtOnImmich)
                logger.info("Writing gallery image.", { image: assetId });
            }));
        }

        // delete all entries that have been removed on immich from our gallery also.
        for (let assedIdToDelete of assetIDsToDelete) {
            const imageOutFile = path.resolve(pathImages, assedIdToDelete);
            logger.info("Deleting trashed gallery image.", { image: assedIdToDelete });
            fs.rmSync(imageOutFile, { force: true, maxRetries: 3, recursive: false, retryDelay: 1 });
        }

        // generate a fresh overview over all existing images in our local gallery.
        let imageFiles = fs.readdirSync(pathImages).filter(f => 
            fs.lstatSync( path.resolve(pathImages, f) ).isFile()
        );
        logger.info("Extracted gallery images!", { imageCount: imageFiles.length })

        return {
            updateAssetsIDs: assetIDsToDownload,
            deleteAssetsIDs: assetIDsToDelete
        };
    } catch (error) {
        logger.error("Error reading in images from immich gallery!", { error: error });
        return { deleteAssetsIDs: [], updateAssetsIDs: [] };
    }
}