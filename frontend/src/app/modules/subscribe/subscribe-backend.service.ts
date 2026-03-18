import { Injectable, Injector, Signal, signal, WritableSignal } from '@angular/core';
import { BackendService } from '../../api/backend.service';
import { ApiInterfaceSubscribeIn, ApiInterfaceSubscribeOut } from '../../../../../api_common/subscribe';

@Injectable({
	providedIn: 'root',
})
export class SubscribeBackendService extends BackendService {

	public static API_URL_SUBSCRIBE = "/module/subscribe/subscribe"
	public static API_URL_UNSUBSCRIBE = "/module/subscribe/unsubscribe"

	name(): string {
		return "Subscribe";
	}

	constructor(
		override injector: Injector
	) {
		super(injector)
	};
}
