import config from 'config';
import * as fs from 'fs';
import { getFilePathFrontend, getRepeatedScheduler } from "../..";
import { ApiInterfaceMembersOut, Member } from '../../../api_common/members';
import { ApiModule } from "../../api_module";
import * as immich from '../../framework/immich_api';
import * as exif from 'exiftool-vendored';
import { ApiInterfaceEmptyIn } from '../../../api_common/backend_call';

export class ApiModuleMembers extends ApiModule {

    SYNCHRONIZE_INTERVAL_MINUTES = config.get('immich.SYNCHRONIZE_INTERVAL_MINUTES') as number;

    memberFiles: Member[] = [];
    urlPathMemberpics = "/members"
    urlPathMemberpicsThumbs = "/members/thumbs"
    filePathMemberpics = "";
    filePathMemberpicsThumbnails = "";

    memberAlbum!: immich.SyncableAlbum;

    async initialize() {
        this.filePathMemberpics = getFilePathFrontend() + this.urlPathMemberpics;
        this.filePathMemberpicsThumbnails = getFilePathFrontend() + this.urlPathMemberpicsThumbs;

        this.memberAlbum = immich.registerImmichAlbumSynch(config.get('immich.MEMBERS_ALBUM') as string, this.urlPathMemberpics);

        getRepeatedScheduler().scheduleRepeatedEvent(this, "member-sync", 60 * this.SYNCHRONIZE_INTERVAL_MINUTES, (finished) => {
            immich.syncWithImmich(this.memberAlbum).then(async syncResult => {

                let updatedMemberFiles: Member[] = [];
                for(let file of fs.readdirSync(this.filePathMemberpics)) {
                    let fPath = this.filePathMemberpics + "/" + file;
                    if (fs.lstatSync(fPath).isFile()) {
                        let desc = (await exif.exiftool.read(fPath)).Description || "";
                        let name = "";
                        let role = "";

                        if (desc.split("\n").length == 2) {
                            name = desc.split("\n")[0];
                            role = desc.split("\n")[1];
                        }
                        updatedMemberFiles.push({
                            file: file,
                            name: name,
                            role: role
                        });
                        this.memberFiles = updatedMemberFiles;
                    }
                };

                immich.generateAssetThumbnails(this.filePathMemberpics, this.filePathMemberpicsThumbnails, syncResult, 1024).then(() => {
                    finished();
                });
            });
        }, true);
    }

    modname(): string {
        return "members";
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceEmptyIn, ApiInterfaceMembersOut>("members", async req => {
            return {
                statusCode: 200,
                error: undefined,
                responseObject: {
                    members: this.memberFiles,
                    thumbnails: this.urlPathMemberpicsThumbs,
                    big: this.urlPathMemberpics,
                    thumbnailFormat: "webp"
                }
            }
        });
    }
}