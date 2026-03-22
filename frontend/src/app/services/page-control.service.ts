import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
	providedIn: 'root',
})
export class PageControlService {

	public preventBodyScrolling: WritableSignal<boolean> = signal(false);

}
