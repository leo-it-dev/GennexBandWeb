import { Component, computed, effect, ElementRef, Signal, ViewChild } from '@angular/core';
import { PageControlService } from '../services/page-control.service';
import { GalleryBackendService } from '../modules/gallery/gallery-backend.service';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { BigOverlayComponent } from '../big-overlay/big-overlay.component';
import { DiamondImageMapComponent } from '../diamond-image-map/diamond-image-map.component';

@Component({
	selector: 'app-gallery-overlay',
	imports: [LottieComponent, BigOverlayComponent, DiamondImageMapComponent],
	templateUrl: './gallery-overlay.component.html',
	styleUrl: './gallery-overlay.component.scss',
})
export class GalleryOverlayComponent {

	@ViewChild('bigImage')
	bigImage?: ElementRef;

	public animationOptions: Signal<AnimationOptions> = computed(() => {
		return {
			path: "/images/lottiefiles/loading.json",
			loop: true,
			autoplay: true
		}
	});

	constructor(public elRef: ElementRef, private pageControl: PageControlService, public backend: GalleryBackendService) {
		effect(() => {
			this.pageControl.preventBodyScrolling.set(this.backend.showBigGallery() || this.backend.showBigImageLR() != "");
		});
	}

	closeBigImage() {
		this.backend.showBigImageLR.set("");
		this.backend.showBigImageHR.set("");
	}

}
