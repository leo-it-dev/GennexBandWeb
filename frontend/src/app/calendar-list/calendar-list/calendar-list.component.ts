import { Component, effect, signal, WritableSignal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Attachment, CalendarEntry } from '../../../../../api_common/calendar';
import { CalendarBackendService } from '../../modules/calendar/calendar-backend.service';
import { SectionHeaderComponent } from '../../section-header/section-header.component';
import { PageControlService } from '../../services/page-control.service';
import { PdfRenderService } from '../../services/pdf-render.service';

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
	imports: [SectionHeaderComponent],
	templateUrl: './calendar-list.component.html',
	styleUrl: './calendar-list.component.scss',
})
export class CalendarListComponent {

	elements: CalendarEntry[] = [];

	resolvedBigImage: WritableSignal<CalendarEntryWithUrl | undefined> = signal(undefined);

	constructor(public calendar: CalendarBackendService,
		private domSan: DomSanitizer,
		private pageControl: PageControlService,
		private pdfRender: PdfRenderService) {

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
		return (date.getDate() < 10 ? "0" : "") + date.getDate() + "." + ((date.getMonth() + 1) < 10 ? "0" : "") + (date.getMonth() + 1) + "." + date.getFullYear() + " "
			+ (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
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
}
