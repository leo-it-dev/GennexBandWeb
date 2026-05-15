import { Injectable, Injector, signal, WritableSignal } from '@angular/core';
import { ApiInterfaceEmptyIn } from '../../../../../api_common/backend_call';
import { ApiInterfaceDocumentsOut, DownloadableDocument, ForwardLink } from '../../../../../api_common/documents';
import { BackendService } from '../../api/backend.service';

@Injectable({
	providedIn: 'root',
})
export class DocumentsBackendService extends BackendService {

	public static API_URL_DOCUMENTS = "/module/documents/documents"

	public documents: WritableSignal<DownloadableDocument[]> = signal([]);
	public links: WritableSignal<ForwardLink[]> = signal([]);
	public documentsLoaded = false;

	name(): string {
		return "Documents";
	}

	constructor(
		override injector: Injector
	) {
		super(injector)

		this.anonymousBackendCall<ApiInterfaceEmptyIn, ApiInterfaceDocumentsOut>(DocumentsBackendService.API_URL_DOCUMENTS).then(dat => {
			this.documents.set(dat.documents);
			this.links.set(dat.links);
			this.documentsLoaded = true;
		}).catch(err => {
			console.error("Error retrieving documents data: ", err);
		});
	};
}
