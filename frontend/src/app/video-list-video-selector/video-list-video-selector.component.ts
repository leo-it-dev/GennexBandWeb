import { Component } from '@angular/core';
import { VideosBackendService } from '../modules/videos/videos-backend.service';

@Component({
	selector: 'app-video-list-video-selector',
	imports: [],
	templateUrl: './video-list-video-selector.component.html',
	styleUrl: './video-list-video-selector.component.scss',
})
export class VideoListVideoSelectorComponent {

	constructor(public back: VideosBackendService) {}

	formatIdx(idx: number) {
		return (idx < 10 ? '0' : '') + (idx + 1);
	}
}
