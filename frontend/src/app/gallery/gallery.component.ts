import { AfterViewInit, Component, computed, effect, ElementRef, QueryList, Signal, signal, ViewChild, ViewChildren, WritableSignal } from '@angular/core';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { SlotComponent } from '../slot/slot.component';
import { DiamondImageMapComponent } from '../diamond-image-map/diamond-image-map.component';
import { PageControlService } from '../services/page-control.service';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';

@Component({
	selector: 'app-gallery',
	imports: [SectionHeaderComponent, SlotComponent, DiamondImageMapComponent, LottieComponent],
	templateUrl: './gallery.component.html',
	styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements AfterViewInit {

	@ViewChild('wrapper')
	wrapper?: ElementRef;

	@ViewChild('bigImage')
	bigImage?: ElementRef;

	imagesLoaded = false;

	public images: WritableSignal<{ [key: string]: string }> = signal({});
	public thumbnailImageURLs: Signal<string[]> = computed(() => Object.keys(this.images()).map(name => this.thumbnailURLPath + "/" + name));

	public thumbnailURLPath = "";
	public bigURLPath = "";
	public showBigGallery: WritableSignal<boolean> = signal(false);

	public showBigImageHR: WritableSignal<string> = signal("");
	public showBigImageLR: WritableSignal<string> = signal("");
	public hrImageLoaded = false;

	animationOptions: Signal<AnimationOptions> = computed(() => {
		return {
			path: "/images/lottiefiles/loading.json",
			loop: true,
			autoplay: true
		}
	});

	constructor(public elRef: ElementRef, private pageControl: PageControlService) {
		effect(() => {
			this.pageControl.preventBodyScrolling.set(this.showBigGallery() || this.showBigImageLR() != "");
		});
	}

	setClass(obj: HTMLElement, className: string, set: boolean) {
		if (set && !obj.classList.contains(className)) {
			obj.classList.add(className);
		}
		if (!set && obj.classList.contains(className)) {
			obj.classList.remove(className);
		}
	}

	ngAfterViewInit(): void {
		fetch(document.location.origin + "/module/gallery/gallery", {
			method: "GET",
			headers: {
				'Accept': 'application/json'
			}
		}).then(async resp => resp.json()).then(galleryList => {

			this.imagesLoaded = true;

			galleryList = galleryList.content;
			let files: string[] = galleryList["files"];
			let thumbnails = galleryList["thumbnails"];
			let big = galleryList["big"];
			let thumbnailFormat = galleryList["thumbnailFormat"];
			this.thumbnailURLPath = thumbnails;
			this.bigURLPath = big;

			let imageMap: { [key: string]: string } = {};

			files.map(file => {
				let basename = file;
				let sepIdx = basename.lastIndexOf(".");
				let stem = sepIdx != -1 ? basename.substring(0, sepIdx) : basename;

				let thumbnailURL = stem + "." + thumbnailFormat;
				let bigURL = basename;

				imageMap[thumbnailURL] = bigURL;
			});

			this.images.set(imageMap);
		});
	}

	openBigImage(url: string) {
		let thumbBaseName = new URL("https://" + location.host + url).pathname.split("/").pop();
		let bigFileName = this.images()[thumbBaseName ?? ""];
		this.hrImageLoaded = false;
		this.showBigImageHR.set(this.bigURLPath + "/" + bigFileName);
		this.showBigImageLR.set(url);
	}

	hrImageDoneLoading() {
		this.hrImageLoaded = true;
	}

	closeBigImage(evt: Event) {
		this.showBigImageLR.set("");
		this.showBigImageHR.set("");
	}
}
