import { AfterViewInit, Component, DOCUMENT, effect, ElementRef, HostListener, Inject, QueryList, Renderer2, signal, ViewChild, ViewChildren, WritableSignal } from '@angular/core';
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
import { PageControlService } from './services/page-control.service';
import { SlotComponent } from './slot/slot.component';
import { VideoListComponent } from './video-list/video-list.component';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, LoadingoverlayComponent, GalleryComponent, ContactComponent, SectionHeaderComponent, DynamicBackgroundImageComponent, PrivacypolicyComponent, ImpressumComponent, SlotComponent, VideoListComponent, ContactChannelsComponent, CalendarListComponent],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
	constructor(private renderer: Renderer2,
		private mp4Extract: MP4FrameExtractionService,
		public loadingOverlay: LoadingoverlayService,
		public pageControl: PageControlService,
		@Inject(DOCUMENT)
		private document: Document
	) {
		effect(() => {
			if (this.pageControl.preventBodyScrolling()) {
				this.document.body.classList.add("preventBodyScrolling");
			} else {
				this.document.body.classList.remove("preventBodyScrolling");
			}
		});

		effect(() => {
			this.pageControl.preventBodyScrolling.set(this.loadingOverlay.loadingOverlayVisible());
		});
	}

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
		let offsetTop = 100;

		let pageHeight = document.body.getBoundingClientRect().height - offsetTop;
		for (let container of this.fadeScrollItemContainers ?? []) {
			let scrollFadeItems = container.nativeElement.getElementsByClassName("fade-scroll-item");
			let parentContainer = (scrollFadeItems[0] as HTMLElement)?.parentElement!;
			let accumTopOffset = parseInt(getComputedStyle(parentContainer).paddingTop ?? "0");

			let sumItemHeight = 0;
			for (let item of scrollFadeItems) {
				sumItemHeight += (item as HTMLElement).getBoundingClientRect().height;
			}
			let offsetForCenterPositionTop = Math.max((pageHeight / 2) - (sumItemHeight / 2), 0);
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
		});

		document.addEventListener("body-scroll", e => {
			e.preventDefault();
			let topOffset = 100;
			for(let cont of this.fadeScrollItemContainers ?? []) {
				let els = cont.nativeElement.getElementsByClassName("fade-scroll-item");
				let parentContainer = (els[0] as HTMLElement).parentElement!;
				let sumItemHeight = 0;
				for (let el of (els as HTMLElement[])) {
					sumItemHeight += el.getBoundingClientRect().height;
				}
				let parentHeight = parentContainer.getBoundingClientRect().height;
				let parentTop = parentContainer.getBoundingClientRect().top;
				let screenHeight = window.innerHeight - topOffset;
				let oversizeHeight = Math.max(0, sumItemHeight - screenHeight);
				let parentContainerScrollPercent = -(parentTop / (parentHeight - screenHeight));

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

				this.renderer.setStyle(parentContainer, 'transform', 'translateY(-' + (parentContainerScrollPercent * oversizeHeight) + 'px)');
			}
		});
	}

	handleScroll(event: Event) {
		document.dispatchEvent(new CustomEvent('body-scroll'));
	}
}
