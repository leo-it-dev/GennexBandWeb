import { Component } from '@angular/core';
import { ColoredSvgComponent } from '../colored-svg/colored-svg.component';
import { DocumentsBackendService } from '../modules/documents/documents-backend.service';

@Component({
	selector: 'app-booking',
	imports: [ColoredSvgComponent],
	templateUrl: './booking.component.html',
	styleUrl: './booking.component.scss',
})
export class BookingComponent {

	constructor(public backend: DocumentsBackendService) {}

	formatFileType(fileName: string) {
		let fileType = fileName.substring(fileName.lastIndexOf(".") + 1, fileName.length);
		return fileType.toUpperCase();
	}

	formatSize(size: number) {
		let labels = ["B", "KB", "MB", "GB", "TB"];
		let idx = 0;

		while(size > 1024 && idx < labels.length-1) {
			size /= 1024;
			idx++;
		}

		return Math.round(size * 10) / 10 + labels[idx];
	}

	formatFileName(fileName: string) {
		let stripped = fileName.replace("_", " ");
		stripped = stripped.substring(0, stripped.lastIndexOf("."));
		return stripped;
	}
}