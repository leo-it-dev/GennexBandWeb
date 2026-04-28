import { computed, Injectable, Injector, Signal, signal, WritableSignal } from '@angular/core';
import { ApiInterfaceGalleryIn, ApiInterfaceGalleryOut } from '../../../../../api_common/gallery';
import { BackendService } from '../../api/backend.service';

@Injectable({
	providedIn: 'root',
})
export class GalleryBackendService extends BackendService {

	public static API_URL_GALLERY = "/module/gallery/gallery"

	public thumbnailImageURLs: WritableSignal<string[]> = signal([]);
	public images: WritableSignal<{[key:string]:string}> = signal({});
	public imagesLoaded = false;
	public bigImagePath: string = "";

	name(): string {
		return "Gallery";
	}

	constructor(
		override injector: Injector
	) {
		super(injector)

		this.anonymousBackendCall<ApiInterfaceGalleryIn, ApiInterfaceGalleryOut>(GalleryBackendService.API_URL_GALLERY).then(dat => {
			let images: {[key:string]:string} = {};
			for (let file of dat.files) {
				let basename = file;
				let sepIdx = basename.lastIndexOf(".");
				let stem = sepIdx != -1 ? basename.substring(0, sepIdx) : basename;

				let thumbnailURL = stem + "." + dat.thumbnailFormat;
				let bigURL = basename;
				this.bigImagePath = dat.big;
				
				images[thumbnailURL] = bigURL;
			}
			this.images.set(images);
			this.thumbnailImageURLs.set(Object.keys(this.images()).map(name => dat.thumbnails + "/" + name));
			this.imagesLoaded = true;

		}).catch(err => {
			console.error("Error retrieving gallery data: ", err);
		});
	};
}
