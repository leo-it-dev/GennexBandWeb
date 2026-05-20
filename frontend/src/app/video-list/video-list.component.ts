import { AfterViewInit, Component, effect, signal, WritableSignal } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { Playlist, VideoInfo } from '../../../../api_common/videos';
import { VideosBackendService } from '../modules/videos/videos-backend.service';
import { PageControlService } from '../services/page-control.service';

@Component({
	selector: 'app-video-list',
	imports: [YouTubePlayer],
	templateUrl: './video-list.component.html',
	styleUrl: './video-list.component.scss',
})
export class VideoListComponent implements AfterViewInit {

	public currentPlaylist?: Playlist = undefined;
	public currentVideo?: VideoInfo = undefined;
	public mobileSelectionScreenOpened: WritableSignal<boolean> = signal(false);

	constructor(public videoService: VideosBackendService, private pageControl: PageControlService) {
		effect(() => {
			this.currentPlaylist = this.videoService.getVideoList()()[0];
			this.currentVideo = this.currentPlaylist.videos[0];
		});

		effect(() => {
			pageControl.preventBodyScrolling.set(this.mobileSelectionScreenOpened());
		})
	}

	ngAfterViewInit(): void {
		const mq = window.matchMedia('(max-width: 700px)'); // same value as variables.scss!!
		const update = () => {
			if(!mq.matches) {
				this.mobileSelectionScreenOpened.set(false);
			}
		};
		mq.addEventListener('change', update);
	}

	formatIdx(idx: number) {
		return (idx < 10 ? '0' : '') + (idx + 1);
	}
}
