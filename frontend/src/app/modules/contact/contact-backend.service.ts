import { Injectable } from '@angular/core';
import { BackendService } from '../../api/backend.service';

@Injectable({
	providedIn: 'root'
})
export class ContactBackendService extends BackendService {

	public static API_URL_CONTACT = "/module/contact/contact"

	name(): string {
		return "Contact";
	}
}