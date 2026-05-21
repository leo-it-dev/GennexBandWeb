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


	public showBigGallery: WritableSignal<boolean> = signal(false);
	public showBigImageHR: WritableSignal<string> = signal("");
	public showBigImageLR: WritableSignal<string> = signal("");
	public hrImageLoaded = false;
	public teaserImages: Signal<string[]> = computed(() => this.selectGalleryImages(this.thumbnailImageURLs(), 5));

	selectGalleryImages(thumbnails: string[], count: number): string[] {
		let images: string[] = [];
		let imagesRemaining = thumbnails;
		for (let i = 0; i < count; i++) {
			images.push(imagesRemaining.splice(Math.floor(Math.random() * imagesRemaining.length), 1)[0]);
		}
		return images;
	}

	openBigImageEvt(event: Event) {
		console.log(event.target);
		this.openBigImage(new URL((event.target as HTMLImageElement).src).pathname);
	}

	openBigImage(url: string) {
		let thumbBaseName = new URL("https://" + location.host + url).pathname.split("/").pop();
		let bigFileName = this.images()[thumbBaseName ?? ""];
		this.hrImageLoaded = false;
		this.showBigImageHR.set(this.bigImagePath + "/" + bigFileName);
		this.showBigImageLR.set(url);
	}

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
