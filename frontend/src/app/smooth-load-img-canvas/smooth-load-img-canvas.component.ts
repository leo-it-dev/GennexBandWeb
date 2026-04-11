import { AfterViewInit, Component, effect, ElementRef, EventEmitter, Input, Output, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import { Subject, switchMap, timer } from 'rxjs';
import { ImageBufferService } from './image-buffer-service';

@Component({
	selector: 'app-smooth-load-img-canvas',
	imports: [],
	templateUrl: './smooth-load-img-canvas.component.html',
	styleUrl: './smooth-load-img-canvas.component.scss',
})
export class SmoothLoadImgCanvasComponent implements AfterViewInit {

	@ViewChild('canvas')
	canvas!: ElementRef<HTMLCanvasElement>;
	renderContext!: CanvasRenderingContext2D;

	@Input()
	imageURLs: Signal<string[]> = signal([]);

	@Input({ required: false })
	imageIntervalSeconds: number = 10;

	@Input({ required: false })
	imageIntervalSecondsMin: number = 5;

	@Output()
	imageClicked: EventEmitter<string> = new EventEmitter<string>();

	@ViewChild('fadeOverlay') viewOverlay!: ElementRef;

	fadeOutTimer = new Subject<void>();

	ngAfterViewInit(): void {
		let bounds = this.canvas.nativeElement.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		this.canvas.nativeElement.width = bounds.width * dpr;
		this.canvas.nativeElement.height = bounds.height * dpr;
		if (this.canvas.nativeElement.getContext) {
			this.renderContext = this.canvas.nativeElement.getContext("2d")!;
		}
	}

	private _src!: string;
	private _nextImage: string = '';

	public showFade: WritableSignal<boolean> = signal(false);
	public fadeDuration = 300;

	@Input()
	set src(value: string) {
		this._nextImage = value;
		this.showFade.set(true);
		// After fade duration, actually switch the image
		this.fadeOutTimer.next();
	}

	get src() {
		return this._src;
	}

	ngOnDestroy() {
		this.stopImageCycle();
	}

	constructor(private imageBufferService: ImageBufferService) {
		effect(() => {
			if (this.imageURLs().length > 0) {
				this.scheduleNextImage(0);
			}
		});

		this.fadeOutTimer.pipe(
			switchMap(() => timer(this.fadeDuration))
		).subscribe(() => this.fadeOutFinished());
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

	private renderCanvas() {
		let bounds = this.canvas.nativeElement.getBoundingClientRect();
		let img = this.imageBufferService.loadImage(this._src).then(img => {
			const dpr = window.devicePixelRatio || 1;

			// Scale drawing operations back
			this.renderContext.setTransform(dpr, 0, 0, dpr, 0, 0);

			let scaleW = Math.max(1, img.width / img.height);
			let scaleH = Math.max(1, img.height / img.width);

			let dx = ((bounds.width * scaleW) - bounds.width) / 2;
			let dy = ((bounds.height * scaleH) - bounds.height) / 2;

			this.renderContext.drawImage(img, -dx, -dy, bounds.width * scaleW, bounds.height * scaleH);

			this.showFade.set(false);

			// Schedule next image change with random interval
			const min = this.imageIntervalSecondsMin * 1000;
			const max = this.imageIntervalSeconds * 1000;
			const randomDelay = Math.floor(Math.random() * (max - min) + min);

			this.scheduleNextImage(randomDelay);
		}).catch(err => {
			console.log("image log error: ", img);
			this.nextImage();
		});
	}

	/** Complete the fade effect */
	private fadeOutFinished() {
		if (this._nextImage) {
			this._src = this._nextImage;
			this._nextImage = '';
			this.renderCanvas();
		}
	}

	handleClick() {
		this.imageClicked.emit(this.src);
	}
}
