import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root',
})
export class DynamicScriptLoaderService {

	private loadedScripts = new Set<string>();

	hasScript(src: string): boolean {
		return this.loadedScripts.has(src);
	}

	loadScript(src: string): Promise<void> {
		return new Promise((resolve, reject) => {
			// already loaded → resolve immediately
			if (this.loadedScripts.has(src)) {
				resolve();
				return;
			}

			const script = document.createElement('script');
			script.src = src;
			script.async = true;
			script.defer = true;

			script.onload = () => {
				this.loadedScripts.add(src);
				resolve();
			};

			script.onerror = () => reject(`Failed to load script: ${src}`);

			document.body.appendChild(script);
		});
	}
}
