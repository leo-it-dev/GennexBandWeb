import { Component, computed, effect, ElementRef, Injector, QueryList, signal, ViewChildren, WritableSignal } from '@angular/core';
import { YouTubePlayer } from '@angular/youtube-player';
import { Playlist } from '../../../../api_common/videos';
import { VideosBackendService } from '../modules/videos/videos-backend.service';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { SlotScrollCommunication } from '../slot/slot.component';
import { computedIsUpdated } from '../utilities';

@Component({
	selector: 'app-video-list',
	imports: [YouTubePlayer, SectionHeaderComponent],
	templateUrl: './video-list.component.html',
	styleUrl: './video-list.component.scss',
})
export class VideoListComponent {

	heightPerElement = "600px";

	scrollCommunication: SlotScrollCommunication = new SlotScrollCommunication();

	@ViewChildren("mediaVideo")
	videoElementsDOM!: QueryList<ElementRef<HTMLElement>>;
	@ViewChildren('ytPlayer')
	youtubePlayersDOM!: QueryList<YouTubePlayer>;

	watchableVideoElementsDOM = computed(() => this.videoElementsDOM);

	selectedPlaylist: WritableSignal<Playlist|undefined> = signal(undefined);

	videoIndex = 0;

	onScroll() {
		let playlist = this.selectedPlaylist();
		if (playlist) {
			let heightPerElement = this.scrollCommunication.scrollBlockHeight() / playlist.videos.length;
			let nthElement = Math.round(this.scrollCommunication.scrollTop() / heightPerElement);
			let snappingScrollTop = (nthElement / playlist.videos.length) * this.scrollCommunication.scrollBlockHeight();
			this.scrollCommunication.scrollOffset.set(snappingScrollTop);

			if (this.videoElementsDOM) {
				for (let i = 0; i < this.videoElementsDOM.length; i++) {
					if (nthElement == i) {
						// this.videoElementsDOM.get(i)?.nativeElement.classList.remove("fadeOut");
					} else {
						// this.videoElementsDOM.get(i)?.nativeElement.classList.add("fadeOut");
						let player = this.youtubePlayersDOM.get(i);
						let playerState = player?.getPlayerState();
						if (player && (!playerState || [YT.PlayerState.BUFFERING, YT.PlayerState.CUED, YT.PlayerState.PLAYING].includes(playerState))) {
							player.stopVideo();
						}
					}
				}
			}
		}
	}

	constructor(private videoService: VideosBackendService, private elRef: ElementRef, private injector: Injector) {
		console.log("Video list initialized!");

		effect(() => {
			let videoList = this.videoService.getVideoList()();
			if (videoList.length > 0) {
				let selectedPlaylist = videoList[0];
				this.selectedPlaylist.set(selectedPlaylist);
				this.scrollCommunication.stickyHeight = computed(() => selectedPlaylist.videos.length * parseInt(this.heightPerElement) + "px");
			}
		});

		window.addEventListener("scroll", e => {
			e.preventDefault();
			this.onScroll();
		});
	}

	getMediaPlaylists() {
		return this.videoService.getVideoList();
	}

	getMediaPlaylistNames() {
		return this.getMediaPlaylists()().map(p => p.playlist.playlistName);
	}

	changePlaylist(playlistTitle: string) {
		let selectedPlaylist = this.getMediaPlaylists()().find(p => p.playlist.playlistName == playlistTitle);
		if (selectedPlaylist) {

			(this.elRef.nativeElement as HTMLElement).scrollIntoView({
				behavior: 'instant',
				block: 'start'
			});

			this.scrollCommunication.stickyHeight = computed(() => selectedPlaylist.videos.length * parseInt(this.heightPerElement) + "px");
			this.selectedPlaylist.set(selectedPlaylist);

			computedIsUpdated(this.injector, this.watchableVideoElementsDOM).then(() => {
				window.dispatchEvent(new Event("scrollcontainer-forceupdate"));
				this.onScroll();
				this.scrollCommunication.scrollOffset.set(0);
			});
		}
	}

	changePlaylistHeaderEvent(event: Event) {
		this.changePlaylist((event.target as HTMLInputElement).value);
	}

	swipeLeft() {
		this.videoIndex--;
		this.videoIndex = Math.max(0, this.videoIndex);
	}

	swipeRight() {
		this.videoIndex++;
		this.videoIndex = Math.min(this.videoIndex, (this.selectedPlaylist()?.videos.length ?? 0) - 1);
	}
}
