import { Component, computed, effect, ElementRef, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { ArrowSvgComponent } from '../arrow-svg/arrow-svg.component';
import { BigOverlayComponent } from '../big-overlay/big-overlay.component';
import { GalleryBackendService } from '../modules/gallery/gallery-backend.service';
import { PageControlService } from '../services/page-control.service';
import { DiamondImageMapComponent } from '../diamond-image-map/diamond-image-map.component';

@Component({
	selector: 'app-gallery',
	imports: [ArrowSvgComponent, BigOverlayComponent, DiamondImageMapComponent, LottieComponent],
	templateUrl: './gallery.component.html',
	styleUrl: './gallery.component.scss'
})
export class GalleryComponent {

	@ViewChild('wrapper')
	wrapper?: ElementRef;

	@ViewChild('bigImage')
	bigImage?: ElementRef;

	public showBigGallery: WritableSignal<boolean> = signal(false);
	public showBigImageHR: WritableSignal<string> = signal("");
	public showBigImageLR: WritableSignal<string> = signal("");
	public hrImageLoaded = false;
	public teaserImages: Signal<string[]> = computed(() => this.selectGalleryImages(this.backend.thumbnailImageURLs(), 5));

	animationOptions: Signal<AnimationOptions> = computed(() => {
		return {
			path: "/images/lottiefiles/loading.json",
			loop: true,
			autoplay: true
		}
	});

	constructor(public elRef: ElementRef, private pageControl: PageControlService, public backend: GalleryBackendService) {
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

	openBigImageEvt(event: Event) {
		console.log(event.target);
		this.openBigImage(new URL((event.target as HTMLImageElement).src).pathname);
	}

	openBigImage(url: string) {
		let thumbBaseName = new URL("https://" + location.host + url).pathname.split("/").pop();
		let bigFileName = this.backend.images()[thumbBaseName ?? ""];
		this.hrImageLoaded = false;
		this.showBigImageHR.set(this.backend.bigImagePath + "/" + bigFileName);
		this.showBigImageLR.set(url);
	}

	hrImageDoneLoading() {
		this.hrImageLoaded = true;
	}

	closeBigImage() {
		this.showBigImageLR.set("");
		this.showBigImageHR.set("");
	}

	selectGalleryImages(thumbnails: string[], count: number): string[] {
		let images: string[] = [];
		let imagesRemaining = thumbnails;
		for (let i = 0; i < count; i++) {
			images.push(imagesRemaining.splice(Math.floor(Math.random() * imagesRemaining.length), 1)[0]);
		}
		return images;
	}
}
