import { AfterViewInit, Component, computed, ElementRef, EventEmitter, inject, Input, Output, signal, Signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AnimationOptions, BMDestroyEvent, LottieComponent } from 'ngx-lottie';
import { overlayCaptchaVerification } from '../../../../api_common/verification';
import { formBuilderGroupFromInputVerifierTemplate } from '../formVerifier';
import { HcaptchaComponent } from '../hcaptcha/hcaptcha.component';
import { LoadingoverlayService, OverlayButton } from '../services/loadingoverlay.service';

@Component({
	selector: 'app-loadingoverlay',
	imports: [LottieComponent, HcaptchaComponent, ReactiveFormsModule],
	templateUrl: './loadingoverlay.component.html',
	styleUrl: './loadingoverlay.component.scss'
})
export class LoadingoverlayComponent implements AfterViewInit {

	private formBuilder = inject(FormBuilder);
	public captchaFormGroup = formBuilderGroupFromInputVerifierTemplate(this.formBuilder, overlayCaptchaVerification);

	constructor(private elRef: ElementRef, private serv: LoadingoverlayService) {}

	close() {
		this.serv.hideLoadingOverlay();
	}

	@Input({ required: true })
	message: Signal<string[]> = signal([""]);
	@Input({ required: true })
	videoURL: Signal<string> = signal("");
	@Input({ required: false })
	videoShouldRepeat: Signal<boolean> = signal(false);

	@Input({ required: false })
	hasInputText: Signal<boolean> = signal(false);
	@Input({ required: false })
	inputPlaceholder: Signal<string> = signal("");
	@Input({ required: false })
	maxInputLength: Signal<number> = signal(100);
	@Output()
	inputTextChange: EventEmitter<string> = new EventEmitter<string>();
	@Input({ required: false })
	inputMarkedErronous: Signal<boolean> = signal(false);
	@Input({ required: false })
	buttons: Signal<OverlayButton[]> = signal([]);
	@Output()
	buttonClicked: EventEmitter<string> = new EventEmitter<string>();
	@Input({required: false})
	hasCaptcha: Signal<boolean> = signal(false);

	animationOptions: Signal<AnimationOptions> = computed(() => 
		{ 
			return {
				path: this.videoURL(),
				loop: this.videoShouldRepeat(),
				autoplay: true
		}
	});

	inputTextChanges(event: Event) {
		let text = (event.target as HTMLInputElement).value;
		this.inputTextChange.emit(text);
	}

	buttonClickedEvt(evt: PointerEvent) {
		this.buttonClicked.emit((evt.target as HTMLButtonElement).textContent);
	}

	ngAfterViewInit(): void {
		this.captchaFormGroup.valueChanges.subscribe(c => {
			let token = this.captchaFormGroup.value['captcha'];
			if (this.serv.captchaSolved) {
				this.serv.captchaSolved(token);
			}
		});
	}
}
