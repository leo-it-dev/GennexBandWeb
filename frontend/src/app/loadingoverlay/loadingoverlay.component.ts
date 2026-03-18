
import { AfterViewInit, Component, effect, ElementRef, EventEmitter, Input, OnDestroy, Output, signal, Signal, ViewChild } from '@angular/core';
import { LoadingoverlayService, OverlayButton } from '../services/loadingoverlay.service';

@Component({
	selector: 'app-loadingoverlay',
	imports: [],
	templateUrl: './loadingoverlay.component.html',
	styleUrl: './loadingoverlay.component.scss'
})
export class LoadingoverlayComponent implements AfterViewInit, OnDestroy {

	constructor(private elRef: ElementRef, private serv: LoadingoverlayService) {
		effect(() => {
			this.videoURL();
			if (this.video) {
				this.video.nativeElement.load()
			}
		});
	}

	fadeIn: boolean = false;

	close() {
		this.serv.hideLoadingOverlay();
	}

	@ViewChild('video')
	video!: ElementRef<HTMLVideoElement>

	@Input({required: true})
	message: Signal<string[]> = signal([""]);
	@Input({required: true})
	videoURL: Signal<string> = signal("");
	@Input({required: false})
	videoShouldRepeat: Signal<boolean> = signal(false);

	@Input({required: false})
	hasInputText: Signal<boolean> = signal(false);
	@Input({required: false})
	inputPlaceholder: Signal<string> = signal("");
	@Input({required: false})
	maxInputLength: Signal<number> = signal(100);
	@Output()
	inputTextChange: EventEmitter<string> = new EventEmitter<string>();
	@Input({required: false})
	inputMarkedErronous: Signal<boolean> = signal(false);
	@Input({required: false})
	buttons: Signal<OverlayButton[]> = signal([]);
	@Output()
	buttonClicked: EventEmitter<string> = new EventEmitter<string>();

	ngAfterViewInit() {
		setTimeout(() => {
			this.fadeIn = true;
		});
	}

	ngOnDestroy() {
		this.fadeIn = false;
	}

	inputTextChanges(event: Event) {
		let text = (event.target as HTMLInputElement).value;
		this.inputTextChange.emit(text);
	}

	buttonClickedEvt(evt: PointerEvent) {
		this.buttonClicked.emit((evt.target as HTMLButtonElement).textContent);
	}
}
