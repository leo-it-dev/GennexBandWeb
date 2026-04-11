import { ApplicationRef, Component, computed, effect, ElementRef, Injector, QueryList, ViewChildren } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { VideosBackendService } from '../modules/videos/videos-backend.service';
import { SlotComponent, SlotScrollCommunication } from '../slot/slot.component';

@Component({
	selector: 'app-video-list',
	imports: [YouTubePlayer, SlotComponent],
	templateUrl: './video-list.component.html',
	styleUrl: './video-list.component.scss',
})
export class VideoListComponent {

	heightPerElement = "70vh";

	scrollCommunication: SlotScrollCommunication = new SlotScrollCommunication();

	@ViewChildren("mediaVideo")
	videoElementsDOM!: QueryList<ElementRef<HTMLElement>>;
	@ViewChildren('ytPlayer')
	youtubePlayersDOM!: QueryList<YouTubePlayer>;

	constructor(private videoService: VideosBackendService,
			private appRef: ApplicationRef,
			private injector: Injector
	) {
		console.log("Video list initialized!");

		effect(() => {
			if (this.videoService.getVideoList()().length > 0) {
				let videoCount = this.videoService.getVideoList()().map(p => p.videos.length).reduce((p, n) => p + n);
				this.scrollCommunication.stickyHeight = computed(() => videoCount * this.vhToPixels(parseInt(this.heightPerElement)) + "px");
			}
		});

		window.addEventListener("scroll", e => {
			e.preventDefault();
			let videoList = this.videoService.getVideoList()();
			if (videoList.length > 0) {
				let videoCount = videoList.map(p => p.videos.length).reduce((p, n) => p + n);
				let heightPerElement = this.scrollCommunication.scrollBlockHeight() / (videoCount);
				let nthElement = Math.round(this.scrollCommunication.scrollTop() / heightPerElement);
				let snappingScrollTop = (nthElement / videoCount) * this.scrollCommunication.scrollBlockHeight();
				this.scrollCommunication.scrollOffset.set(snappingScrollTop);

				if (this.videoElementsDOM) {
					for (let i = 0; i < this.videoElementsDOM.length; i++) {
						if (nthElement == i) {
							this.videoElementsDOM.get(i)?.nativeElement.classList.remove("fadeOut");
						} else {
							this.videoElementsDOM.get(i)?.nativeElement.classList.add("fadeOut");
							let player = this.youtubePlayersDOM.get(i);
							let playerState = player?.getPlayerState();
							if (player && (!playerState || [YT.PlayerState.BUFFERING, YT.PlayerState.CUED, YT.PlayerState.PLAYING].includes(playerState))) {
								player.stopVideo();
							}
						}
					}
				}
			}
		});
	}

	getMediaPlaylists() {
		return this.videoService.getVideoList();
	}

	getMediaPlaylistNames() {
		return this.getMediaPlaylists()().map(p => p.playlist.playlistName);
	}

	vhToPixels(dvh: number) {
		return window.innerHeight / 100 * dvh;
	}
}
