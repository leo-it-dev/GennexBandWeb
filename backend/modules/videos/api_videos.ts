import { ApiInterfaceVideosIn, ApiInterfaceVideosOut, VideoInfo, VideoList } from "../../../api_common/videos";
import { ApiModule } from "../../api_module";
import { YoutubeHelper } from './youtube_helper'
import * as config from 'config';

export class ApiModuleVideos extends ApiModule {

    helper: YoutubeHelper = new YoutubeHelper();
    webPageEmbedMarker = "|-embed-to-page-|";
    channelID: string = "";

    modname(): string {
        return "videos";
    }

    async initialize() {
        this.channelID = config.get('youtube.CHANNEL_ID');
    }

    loginRequired(): boolean {
        return false;
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceVideosIn, ApiInterfaceVideosOut>("videos", async _ => {
            let playlists = await this.helper.getOwnPlaylistsIDsWithTagInDescription(this.webPageEmbedMarker, this.channelID);
            let videoTree: VideoList = []

            for (let playlist of playlists) {
                let videos = await this.helper.getVideoIDsFromPlaylistID(playlist.playlistID);
                videoTree.push({ playlist: playlist, videos: videos });
            }

            return {
                error: undefined,
                statusCode: 200,
                responseObject: {
                    videos: videoTree
                }
            };
        });
    }
}