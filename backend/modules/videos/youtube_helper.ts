import config from 'config';
import { PlaylistInfo, VideoInfo } from '../../../api_common/videos';

export class YoutubeHelper {

    private dataApiKey = "";
    private baseLink = "https://www.googleapis.com/youtube/v3";

    constructor() {
        this.dataApiKey = config.get("youtube.YT_DATA_API_KEY") ?? "<unknown key>";
    }

    async getOwnPlaylistsIDsWithTagInDescription(searchTagLine: string, channelID: string): Promise<PlaylistInfo[]> {
        return new Promise<PlaylistInfo[]>((res, _) => {
            fetch(this.baseLink + '/playlists?part=snippet,contentDetails&Mine=True&maxResults=50&channelId=' + channelID + '&key=' + this.dataApiKey)
                .then(async dat => {
                    let applicablePlaylists: PlaylistInfo[] = [];
                    if (dat.ok) {

                        let content = await dat.json();

                        let playlistItems = content.items;
                        for (let playlist of playlistItems) {
                            let playlistId = playlist.id;
                            let playlistSnippet = playlist.snippet;
                            let playlistName = playlistSnippet.title;
                            let playlistDescription: string = playlistSnippet.description;

                            let descriptionLines = playlistDescription.split("\n");
                            let tagContained = descriptionLines.map(m => m.toLowerCase().replace("\n", "")).includes(searchTagLine.toLowerCase());
                            if (tagContained) {
                                applicablePlaylists.push({ playlistID: playlistId, playlistName: playlistName });
                            }
                        }
                    }
                    res(applicablePlaylists);
                });
        });
    }

    async getVideoIDsFromPlaylistID(playlistId: string): Promise<VideoInfo[]> {
        return new Promise<VideoInfo[]>((res, _) => {
            fetch(this.baseLink + "/playlistItems?playlistId=" + playlistId + "&part=contentDetails%2Csnippet&maxResults=50&key=" + this.dataApiKey)
                .then(async dat => {
                    let videos: VideoInfo[] = [];
                    if (dat.ok) {
                        let content = await dat.json();
                        let videoItems = content.items;
                        for (let video of videoItems) {
                            let videoSnippet = video.snippet;
                            let videoId = videoSnippet.resourceId.videoId;
                            let videoName = videoSnippet.title;
                            let videoDescription = videoSnippet.description;
                            let videoURL = "https://www.youtube.com/embed/" + videoId;

                            videos.push({
                                videoDescription: videoDescription,
                                videoID: videoId,
                                videoName: videoName,
                                videoURL: videoURL
                            })
                        }                        
                    }
                    res(videos);
                });
        });
    }
}
