import { AfterViewInit, Component, effect } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { VideosBackendService } from '../modules/videos/videos-backend.service';
import { PageControlService } from '../services/page-control.service';
import { VideoListPlaylistSelectorComponent } from '../video-list-selector/video-list-playlist-selector.component';
import { VideoListVideoSelectorComponent } from '../video-list-video-selector/video-list-video-selector.component';

@Component({
	selector: 'app-video-list',
	imports: [YouTubePlayer, VideoListPlaylistSelectorComponent, VideoListVideoSelectorComponent],
	templateUrl: './video-list.component.html',
	styleUrl: './video-list.component.scss',
})
export class VideoListComponent implements AfterViewInit {

	constructor(public videoService: VideosBackendService, private pageControl: PageControlService) {
		effect(() => {
			pageControl.preventBodyScrolling.set(this.videoService.mobileVideoListOpened());
		})

		effect(() => {
			if (this.videoService.currentPlaylist() === undefined) {
				let playlist = this.videoService.getVideoList()()[0];
				if (playlist && playlist.videos) {
					this.videoService.currentPlaylist.set(playlist);
					this.videoService.currentVideo.set(playlist.videos[0] ?? undefined);
				}
			}
		});
	}

	ngAfterViewInit(): void {
		const mq = window.matchMedia('(max-width: 700px)'); // same value as variables.scss!!
		const update = () => {
			if(!mq.matches) {
				this.videoService.mobileVideoListOpened.set(false);
			}
		};
		mq.addEventListener('change', update);
	}
}
