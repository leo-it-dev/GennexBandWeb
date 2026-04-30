import { AfterViewInit, Component, effect, ElementRef, signal, ViewChild, WritableSignal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as maplibregl from 'maplibre-gl';
import { Attachment, CalendarEntry } from '../../../../../api_common/calendar';
import { ArrowSvgComponent } from '../../arrow-svg/arrow-svg.component';
import { CalendarBackendService } from '../../modules/calendar/calendar-backend.service';
import { ConfigService } from '../../services/config.service';
import { PageControlService } from '../../services/page-control.service';
import { PdfRenderService } from '../../services/pdf-render.service';
import { BigOverlayComponent } from '../../big-overlay/big-overlay.component';

type AttachmentMapped = {
	sourceURL: string,
	renderedPng: string,
}

export type CalendarEntryWithUrl = {
	entry: CalendarEntry,
	url: SafeResourceUrl,
	attachmentURLs: AttachmentMapped[]
}

@Component({
	selector: 'app-calendar-list',
	imports: [ArrowSvgComponent, BigOverlayComponent],
	templateUrl: './calendar-list.component.html',
	styleUrl: './calendar-list.component.scss',
})
export class CalendarListComponent {

	@ViewChild('flyerScroll')
	private flyerScroll!: ElementRef<HTMLElement>;

	@ViewChild('map')
	set map(el: ElementRef<HTMLElement> | undefined) {
		console.log("MAP!!!");
		if (el) {
			this.initMap(el);
		}
	}

	maplibregl!: maplibregl.Map;

	elements: CalendarEntry[] = [];

	resolvedBigImage: WritableSignal<CalendarEntryWithUrl | undefined> = signal(undefined);
	scrollLeftActive = false;
	scrollRightActive = false;

	constructor(public calendar: CalendarBackendService,
		private domSan: DomSanitizer,
		private pageControl: PageControlService,
		private pdfRender: PdfRenderService,
		private config: ConfigService) {

		effect(async () => {
			let elements = this.calendar.getCalendarData()().entries;
			if (elements) {
				this.elements = elements;
			} else {
				this.elements = [];
			}
		});

		effect(async () => {
			this.pageControl.preventBodyScrolling.set(this.calendar.bigImageEntry() != undefined);

			let bigImageEntry = this.calendar.bigImageEntry();
			if (bigImageEntry) {
				let mappedAttachments: AttachmentMapped[] = [];
				for (let attachment of bigImageEntry.attachments) {
					let resolvedImageURLs = await this.resolveAttachment(attachment);
					for (let renderedPng of resolvedImageURLs) {
						mappedAttachments.push({
							renderedPng: renderedPng,
							sourceURL: attachment.url
						});
					}
				}
				this.resolvedBigImage.set({
					entry: bigImageEntry,
					url: this.domSan.bypassSecurityTrustResourceUrl("https://www.google.com/maps?q=" + bigImageEntry.geocoding?.location.lat + "," + bigImageEntry.geocoding?.location.lon + "&z=15&output=embed"),
					attachmentURLs: mappedAttachments
				});

			} else {
				this.resolvedBigImage.set(undefined);
			}
		});
	}

	formatDate(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
	}
	formatTime(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { hour: '2-digit', minute: '2-digit', hour12: false }).format(date) + " Uhr";
	}

	async resolveAttachment(attachment: Attachment): Promise<string[]> {
		if (attachment.mimeType == "application/pdf" || attachment.mimeType.startsWith("image/")) {
			let pdfRenders = await this.pdfRender.awaitPdfRenders();
			let renderedPdf = pdfRenders.find(render => render.sourceURL.toLowerCase() == attachment.url.toLowerCase());
			if (!renderedPdf) {
				return []
			}
			return renderedPdf.pagePngURLs;
		} else {
			return [attachment.url];
		}
	}

	open(url: string) {
		window.open(url, '_blank');
	}

	scrollLeft() {
		this.flyerScroll.nativeElement.scrollBy({
			left: -300,
			behavior: 'smooth'
		});
	}
	scrollRight() {
		this.flyerScroll.nativeElement.scrollBy({
			left: 300,
			behavior: 'smooth'
		});
	}

	scroll(): void {
		this.flyerScroll.nativeElement.addEventListener("scroll", (ev) => {
			this.scrollLeftActive = this.flyerScroll.nativeElement.scrollLeft > 0;
			this.scrollRightActive = this.flyerScroll.nativeElement.scrollLeft < this.flyerScroll.nativeElement.scrollWidth - this.flyerScroll.nativeElement.getBoundingClientRect().width;
		});
	}

	initMap(element: ElementRef<HTMLElement>) {
		let promises = Promise.allSettled([
			fetch("https://gennex.band:3000/europe"),
			fetch("https://gennex.band:3000/mapstyles/style.json")
		]);

		promises.then(async promises => {
			if (promises.find(p => p.status == 'rejected')) {
				console.error("Error reading in map data!");
			}
			if (promises[0].status == 'fulfilled' && promises[1].status == 'fulfilled') {
				let meta = await promises[0].value.json();
				let style = await promises[1].value.json();

				let maxZoom = meta["maxzoom"];
				let minZoom = meta["minzoom"];

				this.maplibregl = new maplibregl.Map({
					container: "calendar-entry-map",
					style: style,
					attributionControl: false,
					maxZoom: maxZoom,
					minZoom: minZoom,
					zoom: maxZoom,
					center: [
						this.resolvedBigImage()?.entry.geocoding?.location.lon || 0,
						this.resolvedBigImage()?.entry.geocoding?.location.lat || 0,
					]
				});
				this.maplibregl.on('load', () => {
					this.addMarker(
						this.resolvedBigImage()?.entry.geocoding?.location.lat || 0,
						this.resolvedBigImage()?.entry.geocoding?.location.lon || 0);
				});
			}
		});
	}

	addMarker(lat: number, lon: number, color?: string, popupMessage?: string) {
		let marker = new maplibregl.Marker({
			color: color,
		}).setLngLat([lon, lat])

		if (popupMessage) {
			marker.setPopup(
				new maplibregl.Popup({
					className: 'maplibre-popup'
				}).setText(popupMessage)
			)
		}
		marker.addTo(this.maplibregl);
	}

	openMapsLink() {
		window.open("https://www.google.com/maps/search/?api=1&query=" + this.resolvedBigImage()?.entry.geocoding?.location.lat + "," + this.resolvedBigImage()?.entry.geocoding?.location.lon, "_blank");
	}
}
