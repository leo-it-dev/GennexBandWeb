import { Injectable } from '@angular/core';
import { ApiInterfaceRenderedPDFsIn, ApiInterfaceRenderedPDFsOut, RenderedPDF } from '../../../../api_common/rendered_pdfs';
import { BackendService } from '../api/backend.service';
import { timeout } from '../utilities';

@Injectable({
	providedIn: 'root',
})
export class PdfRenderService {

	private static pdfRenders: RenderedPDF[] | undefined = undefined;

	constructor(backendService: BackendService) {
		if (PdfRenderService.pdfRenders == undefined) {
			
			backendService.anonymousBackendCall<ApiInterfaceRenderedPDFsIn, ApiInterfaceRenderedPDFsOut>("/module/renderedpdf/list", {}).then(dat => {
				PdfRenderService.pdfRenders = dat.renderedPDFs;
			}).catch(err => {
				console.error("Error loading rendered pdfs endpoint from backend!: ", err);
			})
		}
	}

	async awaitPdfRenders(): Promise<RenderedPDF[]> {
		while (PdfRenderService.pdfRenders == undefined) {
			await timeout(100);
		}
		return PdfRenderService.pdfRenders;
	}
}
