import { effect, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { PageControlService } from './page-control.service';

export type OverlayButton = {
	text: string,
	color: string
}

@Injectable({
	providedIn: 'root'
})
export class LoadingoverlayService {

	loadingOverlayVisible = signal(false);

	videoURL: WritableSignal<string> = signal("unknown");
	videoShouldRepeat: WritableSignal<boolean> = signal(true);
	message: WritableSignal<string[]> = signal(["unknown"]);

	hasInputText: WritableSignal<boolean> = signal(false);
	inputPlaceholder: WritableSignal<string> = signal("Placeholder");
	inputMaxLength: WritableSignal<number> = signal(100);
	subscribeTextChange?: Function = undefined;
	subscribeButtonClicked?: Function = undefined;
	captchaSolved?: Function = undefined;

	inputInvalid: WritableSignal<boolean> = signal(false);

	buttons: WritableSignal<OverlayButton[]> = signal([]);

	hasCaptcha: WritableSignal<boolean> = signal(false);

	inputTextChange(newText: string) {
		if (this.subscribeTextChange) {
			this.subscribeTextChange(newText);
		}
		this.inputInvalid.set(false);
	}

	buttonClicked(text: string) {
		if (this.subscribeButtonClicked) {
			this.subscribeButtonClicked(text);
		}
	}

	constructor(private pageControl: PageControlService) {
		effect(() => {
			this.pageControl.preventBodyScrolling.set(this.loadingOverlayVisible());
		});
	}

	showLoadingOverlay(message: string[], videoURL: string, videoShouldRepeat: boolean, hasInputText: boolean, inputPlaceholder: string, inputMaxLength: number, inputTextChange: Function, buttons: OverlayButton[] = [], buttonClicked: Function = (btn: OverlayButton) => {}, hasCaptcha = false, captchaSolved: Function = (token: string) => {}) {
		this.videoURL.set(videoURL);
		this.message.set(message);
		this.hasInputText.set(hasInputText);
		this.videoShouldRepeat.set(videoShouldRepeat);
		this.inputPlaceholder.set(inputPlaceholder);
		this.inputMaxLength.set(inputMaxLength);
		this.subscribeTextChange = inputTextChange;
		this.buttons.set(buttons);
		this.subscribeButtonClicked = buttonClicked;
		this.loadingOverlayVisible.set(true);
		this.inputInvalid.set(false);
		this.hasCaptcha.set(hasCaptcha);
		this.captchaSolved = captchaSolved;
	}
	hideLoadingOverlay() {
		this.loadingOverlayVisible.set(false);
	}

	getVideoURL(): Signal<string> {
		return this.videoURL;
	}

	getMessage(): Signal<string[]> {
		return this.message;
	}

	markInputErronous() {
		this.inputInvalid.set(true);
	}
}
