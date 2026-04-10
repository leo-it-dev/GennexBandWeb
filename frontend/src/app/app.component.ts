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
import { ScrollItemFadeContainerComponent } from './scroll-item-fade-container/scroll-item-fade-container.component';
import { LoadingoverlayService } from './services/loadingoverlay.service';
import { MP4FrameExtractionService } from './services/mp4frame/mp4-frame-extraction.service';
import { PageControlService } from './services/page-control.service';
import { SlotComponent } from './slot/slot.component';
import { VideoListComponent } from './video-list/video-list.component';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, LoadingoverlayComponent, GalleryComponent, ContactComponent, DynamicBackgroundImageComponent, PrivacypolicyComponent, ImpressumComponent, SlotComponent, VideoListComponent, ContactChannelsComponent, CalendarListComponent, ScrollItemFadeContainerComponent],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
	constructor(
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

	@ViewChildren('backgroundTrigger')
	private backgroundTriggerList!: QueryList<ElementRef>;
	public backgroundTriggers: WritableSignal<ElementRef<HTMLElement>[]> = signal([]);

	doShowPrivacyPolicy: boolean = false;
	doShowImpressum: boolean = false;

	aboutUsTexts = [
		"Wir sind GENNEX, eine junge Partyband aus der Region Mühldorf -\
		laut gestartet als Schülerband und heute fester Bestandteil der lokalen Musikszene.",

		"Seit sechs Jahren liefern wir, was zählt: maximale Stimmung, volle Bühnenenergie und ein\
		Programm,\
		das keine Wünsche offenlässt. Von Punkrock über aktuelle Hits bis zu Partyklassikern - wir\
		bringen\
		den Soundtrack für unvergessliche Abende.",

		"Ob Geburtstag, Stadtfest oder große Bühne - wir spielen nicht einfach Songs. Wir liefern Abriss\
		mit\
		Leidenschaft.",

		"Du willst feiern?\
		Dann hör rein, check unsere Bilder und lass uns deine Bühne zum Beben bringen."
	]

	ngAfterViewInit(): void {
		this.backgroundTriggers.set(this.backgroundTriggerList.toArray());
		this.backgroundTriggerList.changes.subscribe(list => {
			this.backgroundTriggers.set(list.toArray());
		});
	}

	handleScroll(event: Event) {
		document.dispatchEvent(new CustomEvent('body-scroll'));
	}
}
