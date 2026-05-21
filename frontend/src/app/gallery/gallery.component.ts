import { Component, computed, ElementRef, Signal, ViewChild } from '@angular/core';
import { AnimationOptions } from 'ngx-lottie';
import { ColoredSvgComponent } from '../colored-svg/colored-svg.component';
import { GalleryBackendService } from '../modules/gallery/gallery-backend.service';

@Component({
	selector: 'app-gallery',
	imports: [ColoredSvgComponent],
	templateUrl: './gallery.component.html',
	styleUrl: './gallery.component.scss'
})
export class GalleryComponent {

	@ViewChild('wrapper')
	wrapper?: ElementRef;

	constructor(public elRef: ElementRef, public backend: GalleryBackendService) {}

	setClass(obj: HTMLElement, className: string, set: boolean) {
		if (set && !obj.classList.contains(className)) {
			obj.classList.add(className);
		}
		if (!set && obj.classList.contains(className)) {
			obj.classList.remove(className);
		}
	}
}
