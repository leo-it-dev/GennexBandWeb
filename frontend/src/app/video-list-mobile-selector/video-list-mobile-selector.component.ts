import { Component, effect, ElementRef } from '@angular/core';
import { VideoListVideoSelectorComponent } from '../video-list-video-selector/video-list-video-selector.component';
import { VideoListPlaylistSelectorComponent } from '../video-list-playlist-selector/video-list-playlist-selector.component';
import { VideosBackendService } from '../modules/videos/videos-backend.service';

@Component({
	selector: 'app-video-list-mobile-selector',
	imports: [VideoListVideoSelectorComponent, VideoListPlaylistSelectorComponent],
	templateUrl: './video-list-mobile-selector.component.html',
	styleUrl: './video-list-mobile-selector.component.scss',
})
export class VideoListMobileSelectorComponent {

	constructor(public elRef: ElementRef<HTMLElement>, public videoServ: VideosBackendService) {
		effect(() => {
			if (videoServ.mobileVideoListOpened()) {
				this.elRef.nativeElement.classList.add("mobileOpened");
			} else {
				this.elRef.nativeElement.classList.remove("mobileOpened");
			}
		})
	}


}
