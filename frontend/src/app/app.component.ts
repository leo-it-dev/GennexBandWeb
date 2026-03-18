import { AfterViewInit, Component, ElementRef, HostListener, QueryList, Renderer2, signal, ViewChild, ViewChildren, WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CalendarListComponent } from './calendar-list/calendar-list/calendar-list.component';
import { ContactChannelsComponent } from './contact-channels/contact-channels.component';
import { ContactComponent } from './contact/contact.component';
import { DynamicBackgroundImageComponent } from './dynamic-background-image/dynamic-background-image.component';
import { GalleryComponent } from './gallery/gallery.component';
import { ImpressumComponent } from './impressum/impressum.component';
import { LoadingoverlayComponent } from './loadingoverlay/loadingoverlay.component';
import { PrivacypolicyComponent } from './privacypolicy/privacypolicy.component';
import { SectionHeaderComponent } from './section-header/section-header.component';
import { LoadingoverlayService } from './services/loadingoverlay.service';
import { MP4FrameExtractionService } from './services/mp4frame/mp4-frame-extraction.service';
import { SlotComponent } from './slot/slot.component';
import { VideoListComponent } from './video-list/video-list.component';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, LoadingoverlayComponent, GalleryComponent, ContactComponent, SectionHeaderComponent, DynamicBackgroundImageComponent, PrivacypolicyComponent, ImpressumComponent, SlotComponent, VideoListComponent, ContactChannelsComponent, CalendarListComponent],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
	title = 'gennex-web-fe';

	constructor(private renderer: Renderer2,
		private mp4Extract: MP4FrameExtractionService,
		public loadingOverlay: LoadingoverlayService
	) { }

	// @ViewChild('canv')
	// private canvas: ElementRef | undefined = undefined;

	// @ViewChild('absLogoContainer')
	// private scrollTrigger: ElementRef | undefined = undefined;

	contactInfo = [
		"El1",
		"El2",
		"El3",
		"El4",
		"El5",
		"El6",
		"El7",
		"El8",
		"El9",
		"El10",
	];

	frames: VideoFrame[] = [];

	@ViewChildren('fadeScrollItemContainer')
	private fadeScrollItemContainers: ElementRef[] | undefined = undefined;

	@ViewChild('aboutUsText')
	private aboutUsText: ElementRef | undefined = undefined;

	@ViewChildren('backgroundTrigger')
	private backgroundTriggerList!: QueryList<ElementRef>;
	public backgroundTriggers: WritableSignal<ElementRef<HTMLElement>[]> = signal([]);

	doShowPrivacyPolicy: boolean = false;
	doShowImpressum: boolean = false;

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

		this.backgroundTriggers.set(this.backgroundTriggerList.toArray());
		this.backgroundTriggerList.changes.subscribe(list => {
			this.backgroundTriggers.set(list.toArray());
		})

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
					let scrollPercent = Math.min(scrollPercentTop, scrollPercentBtm);
					this.renderer.setStyle(el, 'opacity', scrollPercent.toString());

					if (el == els[0]) {
						this.renderer.setStyle(this.aboutUsText?.nativeElement, 'backdrop-filter', 'blur(' + (scrollPercentTop * 10).toString() + 'px)');
					}
				}
			}
		});

		// this.mp4Extract.extractFramesFromMp4Video("images/particles_hres.mp4").then(async (frames) => {
		// 	let canvas = (this.canvas?.nativeElement as HTMLCanvasElement);
		// 	canvas.width = frames[0].codedWidth;
		// 	canvas.height = frames[0].codedHeight;

		// 	this.frames = frames;

		// 	console.log("Successfully extracted " + this.frames.length + " frames from video!");
		// }).catch(error => {
		// 	console.log(error);
		// });


		// if (this.canvas) {
		// 	let canvas = (this.canvas.nativeElement as HTMLCanvasElement);
		// 	let videoContext = canvas.getContext('2d');
			
		// 	if (videoContext) {
		// 		videoContext.imageSmoothingEnabled = false;
		// 		let framePending = false;
		// 		document.addEventListener("scroll", e => {
		// 			e.preventDefault();
		// 			if (this.scrollTrigger !== undefined) {
		// 				let height = parseFloat(getComputedStyle(this.scrollTrigger.nativeElement).height);
		// 				let lastScrollPercent = (height - (parseFloat(this.scrollTrigger.nativeElement.getBoundingClientRect().y)) - height/2) / (height*1.5);
						
		// 				if (!framePending) {
		// 					//framePending = true;
		// 					requestAnimationFrame(() => {
		// 						if (this.frames.length > 0) {
		// 							let frameIdx = Math.max(0, Math.min(this.frames.length - 1, Math.floor(this.frames.length * lastScrollPercent)));
		// 							let prevFrameIdx = frameIdx > 0 ? frameIdx - 1 : 0;
		// 							let percentPerFrame = 1.0 / this.frames.length;
		// 							let interp = (lastScrollPercent - (percentPerFrame * frameIdx)) / percentPerFrame;
									
		// 							videoContext.globalAlpha = 1.0;
		// 							videoContext.drawImage(this.frames[prevFrameIdx], 0, 0, canvas.width, canvas.height);
		// 							videoContext.globalAlpha = interp;
		// 							videoContext.drawImage(this.frames[frameIdx], 0, 0, canvas.width, canvas.height);
		// 						}
		// 						//framePending = false;
		// 					});
		// 				}
		// 			};
		// 		});
		// 	} else {
		// 		throw Error("Error receiving 2d drawing context from canvas!");
		// 	}
		// } else {
		// 	console.log("can't find canvas!");
		// }
	}

	showImpressum() {

	}
}
