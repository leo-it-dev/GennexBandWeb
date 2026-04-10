import { getRepeatedScheduler } from "../..";
import { ApiInterfaceVideosIn, ApiInterfaceVideosOut, VideoInfo, VideoList } from "../../../api_common/videos";
import { ApiModule } from "../../api_module";
import { ScheduledRepeatedEvent } from "../../framework/scheduled_events";
import { YoutubeHelper } from './youtube_helper'
import config from 'config';

export class ApiModuleVideos extends ApiModule {

    helper: YoutubeHelper = new YoutubeHelper();
    webPageEmbedMarker = "|-embed-to-page-|";
    channelID: string = "";

    updateYtInformationScheduler?: ScheduledRepeatedEvent;

    videoList: VideoList = [];

    modname(): string {
        return "videos";
    }

    async initialize() {
        this.channelID = config.get('youtube.CHANNEL_ID');
    
        let updateInterval = parseInt(config.get("youtube.UPDATE_INTERVAL_MINUTES")) * 60;
        this.updateYtInformationScheduler = getRepeatedScheduler().scheduleRepeatedEvent(this, "Update YT Data", updateInterval, async () => {
            this.logger().info("Updating youtube video information...");
            let playlists = await this.helper.getOwnPlaylistsIDsWithTagInDescription(this.webPageEmbedMarker, this.channelID);
            let videoTree: VideoList = []

            for (let playlist of playlists) {
                let videos = await this.helper.getVideoIDsFromPlaylistID(playlist.playlistID);
                videoTree.push({ playlist: playlist, videos: videos });
            }

            this.videoList = videoTree;

            const videoCount = this.videoList.map(v => v.videos.length).reduce((p, c) => p + c, 0);

            this.logger().info("Updated youtube video information! Found: " + this.videoList.length + " playlists with " + videoCount + " videos!");
        }, true);
    }

    registerEndpoints(): void {
        this.get<ApiInterfaceVideosIn, ApiInterfaceVideosOut>("videos", async _ => {

            return {
                error: undefined,
                statusCode: 200,
                responseObject: {
                    videos: this.videoList
                }
            };
        });
    }
}