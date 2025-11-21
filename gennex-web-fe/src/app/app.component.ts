import { AfterViewInit, Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild, ViewChildren } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ParallaxScrollerSlotComponent } from './parallax-scroller-slot/parallax-scroller-slot.component';
import { GalleryComponent } from './gallery/gallery.component';
import { MP4FrameExtractionService } from './services/mp4frame/mp4-frame-extraction.service';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, ParallaxScrollerSlotComponent, GalleryComponent],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit {
	title = 'gennex-web-fe';

	constructor(private renderer: Renderer2,
		private mp4Extract: MP4FrameExtractionService
	) { }

	@ViewChild('canv')
	private canvas: ElementRef | undefined = undefined;

	@ViewChild('absLogoContainer')
	private scrollTrigger: ElementRef | undefined = undefined;


	frames: VideoFrame[] = [];

	@ViewChildren('fadeScrollItemContainer')
	private fadeScrollItemContainers: ElementRef[] | undefined = undefined;

	ngOnInit(): void {
	}

	@HostListener('window:resize')
	onResize() {
		// scroll animation items
		let pageHeight = document.body.getBoundingClientRect().height;
		for (let container of this.fadeScrollItemContainers ?? []) {
			let accumTopOffset = parseInt(getComputedStyle(container.nativeElement).paddingTop ?? "0");
			let scrollFadeItems = container.nativeElement.getElementsByClassName("fade-scroll-item");
	
			let sumItemHeight = 0;
			for (let item of scrollFadeItems) {
				sumItemHeight += (item as HTMLElement).getBoundingClientRect().height;
			}
			let offsetForCenterPositionTop = (pageHeight / 2) - (sumItemHeight / 2);
			accumTopOffset += offsetForCenterPositionTop;

			for (let item of scrollFadeItems) {
				this.renderer.setStyle(item, 'top', accumTopOffset + 'px');
				accumTopOffset += (item as HTMLElement).getBoundingClientRect().height;
			}
		}
	}

	ngAfterViewInit(): void {

		this.onResize();

		document.addEventListener("scroll", e => {
			e.preventDefault();
			// if (e.target )
			for(let cont of this.fadeScrollItemContainers ?? []) {
				let scrollOff = cont.nativeElement.getBoundingClientRect().top;
				let els = cont.nativeElement.getElementsByClassName("fade-scroll-item");
				for (let el of els) {
					let elRect = (el as HTMLElement).getBoundingClientRect();
					let scrollPercentTop = Math.min(1.0, Math.max(0.0, 1.0 - (elRect.top - parseInt(getComputedStyle(el).top)) / 200));
					let scrollPercentBtm = (cont.nativeElement.getBoundingClientRect().bottom - elRect.bottom) / 200;
					this.renderer.setStyle(el, 'opacity', Math.min(scrollPercentTop, scrollPercentBtm).toString());
				}
			}
		});




		this.mp4Extract.extractFramesFromMp4Video("images/particles_hres.mp4").then(async (frames) => {
			let canvas = (this.canvas?.nativeElement as HTMLCanvasElement);
			canvas.width = frames[0].codedWidth;
			canvas.height = frames[0].codedHeight;

			this.frames = frames;

			console.log("Successfully extracted " + this.frames.length + " frames from video!");
		}).catch(error => {
			console.log(error);
		});


		if (this.canvas) {
			let canvas = (this.canvas.nativeElement as HTMLCanvasElement);
			let videoContext = canvas.getContext('2d');
			
			if (videoContext) {
				videoContext.imageSmoothingEnabled = false;

				let framePending = false;
				document.addEventListener("scroll", e => {
					e.preventDefault();
					if (this.scrollTrigger !== undefined) {
						let height = parseFloat(getComputedStyle(this.scrollTrigger.nativeElement).height);
						let lastScrollPercent = (height - (parseFloat(this.scrollTrigger.nativeElement.getBoundingClientRect().y)) - height/2) / (height*1.5);
						
						if (!framePending) {
							//framePending = true;
							requestAnimationFrame(() => {
								if (this.frames.length > 0) {
									let frameIdx = Math.max(0, Math.min(this.frames.length - 1, Math.floor(this.frames.length * lastScrollPercent)));
									let prevFrameIdx = frameIdx > 0 ? frameIdx - 1 : 0;
									let percentPerFrame = 1.0 / this.frames.length;
									let interp = (lastScrollPercent - (percentPerFrame * frameIdx)) / percentPerFrame;
									
									videoContext.globalAlpha = 1.0;
									videoContext.drawImage(this.frames[prevFrameIdx], 0, 0, canvas.width, canvas.height);
									videoContext.globalAlpha = interp;
									videoContext.drawImage(this.frames[frameIdx], 0, 0, canvas.width, canvas.height);
								}
								//framePending = false;
							});
						}
					};
				});
			} else {
				throw Error("Error receiving 2d drawing context from canvas!");
			}
		} else {
			console.log("can't find canvas!");
		}
	}
}
