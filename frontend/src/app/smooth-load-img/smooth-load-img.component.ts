import { AfterViewInit, Component, ElementRef, Input, OnDestroy, signal, WritableSignal, ViewChild, effect, Output, EventEmitter, Signal } from '@angular/core';
import { Subject, Subscription, timer } from 'rxjs';

@Component({
	selector: 'app-smooth-load-img',
	templateUrl: './smooth-load-img.component.html',
	styleUrls: ['./smooth-load-img.component.scss'],
})
export class SmoothLoadImgComponent implements OnDestroy, AfterViewInit {

	private _src!: string;
	private _nextImage: string = '';

	public showFade: WritableSignal<boolean> = signal(false);
	public fadeDuration = 300;

	@Input()
	set src(value: string) {
		this._nextImage = value;
		this.showFade.set(true);
		// After fade duration, actually switch the image
		setTimeout(() => this.fadeOutFinished(), this.fadeDuration);
	}

	get src() {
		return this._src;
	}

	@Input()
	imageURLs: Signal<string[]> = signal([]);

	@Input({ required: false })
	imageIntervalSeconds: number = 10;

	@Input({ required: false })
	imageIntervalSecondsMin: number = 5;

	@Output()
	imageClicked: EventEmitter<string> = new EventEmitter<string>();

	@ViewChild('fadeOverlay') viewOverlay!: ElementRef;

	@ViewChild('img')
	image!: ElementRef;

	ngAfterViewInit(): void {
		this.startImageCycle();
	}

	ngOnDestroy() {
		this.stopImageCycle();
	}

	constructor() {
		effect(() => {
			if (this.imageURLs().length > 0) {
				this.scheduleNextImage(0);
			}
		})
	}

	/** Start the repeating image cycle */
	private startImageCycle() {
		this.scheduleNextImage(0);
	}

	/** Stop the cycle */
	private stopImageCycle() {
	}

	/** Schedule the next image change after `delayMs` */
	private scheduleNextImage(delayMs: number) {
		if (this.imageURLs().length > 0) {
			const sub = timer(delayMs).subscribe(() => this.nextImage());
		}
	}

	/** Pick and show the next image */
	private nextImage() {
		const images = this.imageURLs();
		if (!images.length) return;

		let imageSelectionPool = this.imageURLs().filter(u => u != this._src);
		if (imageSelectionPool.length > 0) {
			this.src = imageSelectionPool[Math.floor(Math.random() * imageSelectionPool.length)];
		}
	}

	/** Called when image fully loaded */
	onLoaded() {
		this.showFade.set(false);

		// Schedule next image change with random interval
		const min = this.imageIntervalSecondsMin * 1000;
		const max = this.imageIntervalSeconds * 1000;
		const randomDelay = Math.floor(Math.random() * (max - min) + min);

		this.scheduleNextImage(randomDelay);
	}

	onError() {
		this.nextImage();
	}

	/** Complete the fade effect */
	private fadeOutFinished() {
		if (this._nextImage) {
			this._src = this._nextImage;
			this._nextImage = '';
		}
	}

	handleClick() {
		this.imageClicked.emit(this.src);
	}
}