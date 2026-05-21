import { Component, effect, ElementRef, EventEmitter, Input, Output, Signal, WritableSignal } from '@angular/core';
import { Playlist, VideoInfo, VideoList } from '../../../../api_common/videos';
import { PageControlService } from '../services/page-control.service';
import { VideosBackendService } from '../modules/videos/videos-backend.service';
import { VideoListVideoSelectorComponent } from '../video-list-video-selector/video-list-video-selector.component';

@Component({
	selector: 'app-video-list-playlist-selector',
	imports: [],
	templateUrl: './video-list-playlist-selector.component.html',
	styleUrl: './video-list-playlist-selector.component.scss',
})
export class VideoListPlaylistSelectorComponent {

	constructor(public back: VideosBackendService) {}
}
