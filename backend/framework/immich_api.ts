import config from 'config';
import * as immich from "@immich/sdk";
import * as fs from 'fs';
import { getFilePathFrontend } from '..';
import { getLogger } from '../logger';
import path = require('path');
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import * as exif from 'exiftool-vendored';
import sharp = require('sharp');

const IMMICH_API_KEY = config.get('immich.API_KEY') as string;
const IMMICH_API_URL = config.get('immich.API_URL') as string;

export type Asset = {
    description: string,
    assetID: string
}

export type SyncableAlbum = {
    albumID: string,
    outputPath: string
}

export type CachedPictureInfo = {
    modifiedAt: Date,
    id: string,
    extension: string
}

export type SyncGalleryResult = {
    updateAssetsIDs: Asset[],
    deleteAssetsIDs: CachedPictureInfo[]
}

const logger = getLogger("immich-api-handler");

let syncAlbums: SyncableAlbum[] = [];

export function initImmich() {
    immich.init({ baseUrl: IMMICH_API_URL + "/api", apiKey: IMMICH_API_KEY });
}

export function registerImmichAlbumSynch(galleryId: string, outputPath: string): SyncableAlbum {
    outputPath = getFilePathFrontend() + outputPath;
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    }
    let album = {albumID: galleryId, outputPath: outputPath};
    syncAlbums.push(album);
    return album;
}


function readLocalAssets(album: SyncableAlbum): CachedPictureInfo[] {
    if (!fs.existsSync(album.outputPath)) {
        fs.mkdirSync(album.outputPath);
    }

    let cachedPictureInfo: CachedPictureInfo[] = [];
    for (let assetIdfilename of fs.readdirSync(album.outputPath)) {
        let assetImagePath = path.resolve(album.outputPath, assetIdfilename);
        if (fs.lstatSync(assetImagePath).isFile()) {
            let modifiedAt = fs.statSync(assetImagePath).mtime;
            let assetId = assetIdfilename.split(".")[0]
            let extension = assetIdfilename.split(".")[1]
            cachedPictureInfo.push({
                id: assetId,
                modifiedAt: modifiedAt,
                extension: extension
            })
        }
    }
    return cachedPictureInfo;
}

async function getAlbum(album: SyncableAlbum): Promise<immich.AlbumResponseDto|undefined> {
    return new Promise<immich.AlbumResponseDto|undefined>(async (res, rej) => {
        const albums = await immich.getAllAlbums({});
        const galleries = albums.find(a => a.albumName.toLowerCase() == album.albumID.toLowerCase())
    
        if (!galleries) {
            logger.error("Can't find specified album!", { albumName: album.albumID, path: album.outputPath });
            res(undefined);
            return;
        }
    
        const gallery = await immich.getAlbumInfo({
            id: galleries.id
        })
    
        res(gallery ? gallery : undefined);
    });
}

export async function syncWithImmich(album: SyncableAlbum): Promise<SyncGalleryResult> {
    // load gallery information with metadata about all entries.
    let gallery = await getAlbum(album);

    if (!gallery) {
        logger.error("Error reading in images from immich album, as no album can be found!", { error: "", albumName: album.albumID, path: album.outputPath });
        return { deleteAssetsIDs: [], updateAssetsIDs: [] };
    }

    let localGallery = readLocalAssets(album);

    // filter for assets that we need to redownload (either new or modified newer than our copy).
    let assetIDsToDownload = gallery.assets.filter(asset => !localGallery.find(cached => cached.id == asset.id && cached.modifiedAt.getTime() == new Date(asset.fileModifiedAt).getTime()))
        .map(a => {
            return {
                assetID: a.id,
                description: a.exifInfo?.description || ""
            } as Asset})
    // filter for assets that we need to delete as they no longer are stored inside the immich album.
    let assetIDsToDelete = localGallery.filter(cached => !gallery.assets.find(asset => asset.id == cached.id));

    try {
        // we need to call getDownloadInfo in order to get an id we can then use to download all files.
        const downloadInfo = await immich.getDownloadInfo({
            downloadInfoDto: {
                assetIds: gallery.assets.filter(
                    asset => assetIDsToDownload.map(a => a.assetID).includes(asset.id)
                        && !assetIDsToDelete.map(asset => asset.id).includes(asset.id))
                    .map(asset => asset.id)
            }
        });
        const assetInfos: {[key:string]:string} = {};
        for (let asset of gallery.assets) {
            if (asset.exifInfo?.description) {
                assetInfos[asset.id] = asset.exifInfo?.description;
            }
        }

        if (assetIDsToDownload.length > 0) {
            // Asynchronously download all new assets from immich to our local gallery.
            await Promise.all(downloadInfo.archives[0].assetIds.map(async (assetId) => {
                let assetURL = IMMICH_API_URL + "/api/assets/" + assetId + "/original?apiKey=" + IMMICH_API_KEY;
                let content = await fetch(assetURL);
                let correspondingAsset = gallery.assets.find(a => a.id == assetId);

                if (correspondingAsset) {
                    let fileExtension = correspondingAsset.originalFileName.substring(correspondingAsset.originalFileName.lastIndexOf(".") + 1)
                    const imageOutFile = path.resolve(album.outputPath, assetId + "." + fileExtension);
    
                    const writeStream = fs.createWriteStream(imageOutFile, { flags: 'w' })
                    await pipeline(Readable.fromWeb(content.body as any), writeStream);

                    // read image description off of immich and copy that into the downloaded image's exif data!
                    const dat = await exif.exiftool.read(imageOutFile, {
                        readArgs: ['-b']
                    });
                    dat.Description = assetId in assetInfos ? assetInfos[assetId] : "";
                    exif.exiftool.write(imageOutFile, dat, {
                        writeArgs: ['-overwrite_original', '-Orientation=']
                    });

                    let dateModified = new Date(correspondingAsset.fileModifiedAt);
                    fs.utimesSync(imageOutFile, dateModified, dateModified)
                    logger.info("Writing image.", { albumName: album.albumID, path: album.outputPath, image: assetId });
                } else {
                    logger.error("Error finding immich asset based on asset id from album!");
                }
            }));
        }

        // delete all entries that have been removed on immich from our gallery also.
        for (let assetIdToDelete of assetIDsToDelete) {
            const imageOutFile = path.resolve(album.outputPath, assetIdToDelete.id + "." + assetIdToDelete.extension);
            logger.info("Deleting trashed image.", { albumName: album.albumID, path: album.outputPath, image: assetIdToDelete + "." + assetIdToDelete.extension });
            fs.rmSync(imageOutFile, { force: true, maxRetries: 3, recursive: false, retryDelay: 1 });
        }

        // generate a fresh overview over all existing images in our local gallery.
        if (!fs.existsSync(album.outputPath)) {
            fs.mkdirSync(album.outputPath);
        }
        let imageFiles = fs.readdirSync(album.outputPath).filter(f => 
            fs.lstatSync( path.resolve(album.outputPath, f) ).isFile()
        );
        logger.info("Extracted images!", { albumName: album.albumID, path: album.outputPath, imageCount: imageFiles.length })

        return {
            updateAssetsIDs: assetIDsToDownload,
            deleteAssetsIDs: assetIDsToDelete
        };
    } catch (error) {
        logger.error("Error reading in images from immich gallery!", { error: error });
        return { deleteAssetsIDs: [], updateAssetsIDs: [] };
    }
}

export async function generateAssetThumbnails(sourceImagesPath: string, thumbnailFolderOut: string, assetSyncResult: SyncGalleryResult, thumbnailImageWidth: number): Promise<void> {
    if (!fs.existsSync(thumbnailFolderOut)) {
        fs.mkdirSync(thumbnailFolderOut);
    }

    let thumbnailLogger = logger.child({ service: 'thumbnail-compressor' });
    thumbnailLogger.info("Starting image thumbnail generation...");

    let filePaths: string[] = [];
    fs.readdirSync(sourceImagesPath).forEach(assetIdfileName => {
        let assetId = assetIdfileName.split(".")[0];
        let assetIdThumbnailPath = path.resolve(sourceImagesPath, assetIdfileName);
        if (fs.lstatSync(assetIdThumbnailPath).isFile()) {
            if (assetSyncResult.updateAssetsIDs.map(a => a.assetID).includes(assetId)) {
                filePaths.push(assetIdThumbnailPath);
                thumbnailLogger.info("Generating asset thumbnail!", { assetId: assetIdfileName });
            }
            else if (assetSyncResult.deleteAssetsIDs.map(asset => asset.id).includes(assetId)) {
                fs.rmSync(assetIdThumbnailPath, { force: true, maxRetries: 3, recursive: false, retryDelay: 1 })
                thumbnailLogger.info("Deleting asset thumbnail!", { assetId: assetIdfileName });
            }
        }
    });

    await Promise.all(filePaths.map(async assetIdFileName => {
        let basename: string = path.basename(assetIdFileName);
        let sepIdx = basename.lastIndexOf(".");
        let stem = sepIdx != -1 ? basename.substring(0, sepIdx) : basename;
        let thumbnailImageName = stem + ".webp";
        let outputFile = path.resolve(thumbnailFolderOut, thumbnailImageName);

        await sharp(assetIdFileName)
            .resize(thumbnailImageWidth)
            .webp({ quality: 70 })
            .toFile(outputFile);
    }));
    thumbnailLogger.info("Finished image thumbnail generation!");
}
