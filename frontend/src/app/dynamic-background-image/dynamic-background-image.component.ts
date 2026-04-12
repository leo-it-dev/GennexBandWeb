import { AfterViewInit, Component, effect, ElementRef, Input, ViewChild, WritableSignal } from '@angular/core';
import { Subject, switchMap, timer } from 'rxjs';

@Component({
	selector: 'app-dynamic-background-image',
	imports: [],
	templateUrl: './dynamic-background-image.component.html',
	styleUrl: './dynamic-background-image.component.scss'
})
export class DynamicBackgroundImageComponent implements AfterViewInit {

	@Input({ required: true })
	triggers!: WritableSignal<ElementRef<HTMLElement>[]>

	@ViewChild('backgroundImg1')
	backgroundImage1!: ElementRef<HTMLImageElement>

	@ViewChild('backgroundImg2')
	backgroundImage2!: ElementRef<HTMLImageElement>

	lastActiveTriggerIdx = -1;
	ctr = false;

	backgroundLayerPrepareTimer = new Subject<void>();

	intersectionObserver = new IntersectionObserver((entries) => {
		let triggers = this.triggers();
		let newActiveTriggerIdx = -1;

		entries.forEach(e => {
			let eIdx = triggers.findIndex(trigger => trigger.nativeElement == e.target);
			if (e.isIntersecting) {
				// if we intersect and the intersecting trigger's idx is larger than our current it must be further down the page.
				// therefore we show the new trigger's image
				newActiveTriggerIdx = Math.max(eIdx, this.lastActiveTriggerIdx);
			}
			if (!e.isIntersecting && eIdx == this.lastActiveTriggerIdx && e.boundingClientRect.y > window.innerHeight) {
				// if we no longer intersect with some trigger we need to check if we scrolled up or downwards.
				// if we scrolled downwards (the trigger left page on the top), we don't really need to do anything, as the current trigger still is active.
				// if we scrolled upwards (the trigger left the page on the bottom), we need to activate the previous trigger (the one with a index smaller the current one).
				newActiveTriggerIdx = triggers.findIndex(t => t.nativeElement == e.target) - 1;
			}
		});

		if (newActiveTriggerIdx != -1 && newActiveTriggerIdx != this.lastActiveTriggerIdx) {
			let image = triggers[newActiveTriggerIdx].nativeElement.getAttribute("img");
			if (image) {
				this.ctr = !this.ctr;
				if (!this.ctr) {
					this.backgroundImage2.nativeElement.src = image;
				} else {
					this.backgroundImage1.nativeElement.src = image;
				}
			}

			this.lastActiveTriggerIdx = newActiveTriggerIdx;
		}
	});

	constructor() {
		effect(() => {
			this.intersectionObserver.disconnect();
			this.triggers().forEach(trigger => this.intersectionObserver.observe(trigger.nativeElement));
		});

		this.backgroundLayerPrepareTimer.pipe(
			switchMap(() => timer(1500)) // 1500ms timeout
		).subscribe(() => {
			this.cleanUpBackgroundForNextSwap();
		});
	}

	cleanUpBackgroundForNextSwap() {
		if (this.ctr) {
			this.backgroundImage2.nativeElement.style.maskPosition = "0% 0%";
			this.backgroundImage2.nativeElement.style.zIndex = "-1";
		} else {
			this.backgroundImage1.nativeElement.style.maskPosition = "0% 0%";
			this.backgroundImage1.nativeElement.style.zIndex = "-1";
		}
	}

	handleImageSwap() {
		if (!this.ctr) {
			this.backgroundImage1.nativeElement.style.zIndex = "-1";
			this.backgroundImage2.nativeElement.style.zIndex = "0";
			this.backgroundImage2.nativeElement.style.maskPosition = "100% 100%";
			this.backgroundImage1.nativeElement.style.maskPosition = "0% 0%";
			this.backgroundLayerPrepareTimer.next();
		} else {
			this.backgroundImage2.nativeElement.style.zIndex = "-1";
			this.backgroundImage1.nativeElement.style.zIndex = "0";
			this.backgroundImage1.nativeElement.style.maskPosition = "100% 100%";
			this.backgroundImage2.nativeElement.style.maskPosition = "0% 0%";
			this.backgroundLayerPrepareTimer.next();
		}
	}

	ngAfterViewInit(): void {
		this.backgroundImage1.nativeElement.onload = () => this.handleImageSwap();
		this.backgroundImage2.nativeElement.onload = () => this.handleImageSwap();
	}
}
