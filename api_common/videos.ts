import { ApiModuleInterfaceB2F, ApiModuleInterfaceF2B } from "./backend_call"

/* Api endpoint videos */


export type PlaylistInfo = {
    playlistID: string,
    playlistName: string
}

export type VideoInfo = {
    videoID: string;
    videoName: string;
    videoURL: string;
    videoDescription: string;
}

export type Playlist = {
    playlist: PlaylistInfo,
    videos: VideoInfo[]
}

export type VideoList = Playlist[]

export interface ApiInterfaceVideosIn extends ApiModuleInterfaceF2B { };
export interface ApiInterfaceVideosOut extends ApiModuleInterfaceB2F { videos: VideoList };