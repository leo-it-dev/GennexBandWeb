import { Injectable, Injector, Signal, signal, WritableSignal } from '@angular/core';
import { ApiInterfaceVideosIn, ApiInterfaceVideosOut, VideoList } from '../../../../../api_common/videos';
import { BackendService } from '../../api/backend.service';

@Injectable({
	providedIn: 'root'
})
export class VideosBackendService extends BackendService {

	public static API_URL_VIDEOS = "/module/videos/videos"

	private videoList: WritableSignal<VideoList> = signal([]);

	name(): string {
		return "Videos";
	}

	constructor(
		override injector: Injector
	) {
		super(injector)

		this.anonymousBackendCall<ApiInterfaceVideosIn, ApiInterfaceVideosOut>(VideosBackendService.API_URL_VIDEOS).then(dat => {
			this.videoList.set(dat.videos);
		}).catch(err => {
			console.error("Error retrieving yt video list: ", err);
		});
	};

	public getVideoList(): Signal<VideoList> {
		return this.videoList;
	}
}