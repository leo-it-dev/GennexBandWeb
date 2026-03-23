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

// TODO: Periodic update, check if new assets are available.

const logger = getLogger("immich-api-handler");

let pathImages = "/gallery";

export function initImmich() {
    immich.init({ baseUrl: IMMICH_API_URL + "/api", apiKey: IMMICH_API_KEY });
    pathImages = getFilePathFrontend() + pathImages;
    if (!fs.existsSync(pathImages)) {
        fs.mkdirSync(pathImages);
    }

    logger.info("Clearing image file directory...");
    fs.rmSync(pathImages, { recursive: true, force: true, retryDelay: 1, maxRetries: 3 });
    fs.mkdirSync(pathImages);
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

export async function getAllImagesFromGallery(): Promise<string[]> {
    let gallery = await getGalleryAlbum();
    try {
        const downloadInfo = await immich.getDownloadInfo({
            downloadInfoDto: {
                assetIds: gallery.assets.map(asset => asset.id)
            }
        });

        await Promise.all(downloadInfo.archives[0].assetIds.map(async (asset) => {
            let assetURL = IMMICH_API_URL + "/api/assets/" + asset + "/original?apiKey=" + IMMICH_API_KEY;
            let content = await fetch(assetURL);
            const imageOutFile = path.resolve(pathImages, asset);
            const writeStream = fs.createWriteStream(imageOutFile, { flags: 'wx' })
            await pipeline(Readable.fromWeb(content.body as any), writeStream);
            logger.info("Writing gallery image.", {image: asset});
        }));

        let imageFiles = fs.readdirSync(pathImages);
        logger.info("Extracted gallery images!", {imageCount: imageFiles.length})
        return imageFiles;
    } catch (error) {
        logger.error("Error reading in images from immich gallery!", {error: error});
        return [];
    }
}