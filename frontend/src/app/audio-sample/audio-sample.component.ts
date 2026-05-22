import { AfterViewInit, Component, effect, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { Sample } from '../../../../api_common/documents';
import { ColoredSvgComponent } from '../colored-svg/colored-svg.component';
import { DocumentsBackendService } from '../modules/documents/documents-backend.service';

type SampleBarGraphData = {
	sample: Sample,
	progress: number,
	playing: boolean
	barGraphLeft: number[],
	barGraphRight: number[],
};

@Component({
	selector: 'app-audio-sample',
	imports: [ColoredSvgComponent],
	templateUrl: './audio-sample.component.html',
	styleUrl: './audio-sample.component.scss',
})
export class AudioSampleComponent {

	draggedSample: HTMLElement | undefined = undefined;
	private activePointerId: number | null = null;

	@ViewChildren('sample')
	samples!: QueryList<ElementRef<HTMLElement>>;

	public sampleData: SampleBarGraphData[] = [];

	convertToBarGraph(audioBuffer: AudioBuffer, barCount: number): number[][] {
		let result: number[][] = [];

		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			let audioRawData = audioBuffer.getChannelData(0);
			let analysis = [];

			let i = 0;
			const length = audioRawData.length;
			while (i < length) {
				analysis.push(audioRawData.slice(i, i += audioRawData.length / barCount).reduce(function (total, value) {
					return Math.max(total, Math.abs(value));
				}))
			}
			result.push(analysis);
		}
		return result;
	}

	renderBarGraph(sample: SampleBarGraphData) {
		let sampleDOM = this.samples.find(s => s.nativeElement.getAttribute('url') == sample.sample.url);
		let barsCanvas = sampleDOM?.nativeElement.getElementsByClassName('sample-bars')[0] as HTMLCanvasElement;
		let renderContext = barsCanvas.getContext('2d');
		barsCanvas.width = barsCanvas.getBoundingClientRect().width;

		let primaryLightAlpha = getComputedStyle(document.body).getPropertyValue('--primaryLightAlpha55');
		let primaryLight = getComputedStyle(document.body).getPropertyValue('--primaryLight');

		if (renderContext) {
			renderContext.imageSmoothingEnabled = false;
			let barWidth = barsCanvas.width / (sample.barGraphLeft.length + 1);
			for (let barIdx = 0; barIdx < sample.barGraphLeft.length; barIdx++) {
				let x = barIdx * barWidth;
				let progress = barIdx / sample.barGraphLeft.length;
				renderContext.strokeStyle = progress < sample.progress ? primaryLight : primaryLightAlpha;
				renderContext.lineWidth = 2;
				renderContext.lineCap = 'round';
				renderContext.beginPath();
				renderContext.moveTo(x + barWidth / 2, barsCanvas.height / 2 - (sample.barGraphLeft[barIdx] / 2 * barsCanvas.height));
				renderContext.lineTo(x + barWidth / 2, barsCanvas.height / 2);
				renderContext.lineTo(x + barWidth / 2, barsCanvas.height / 2 + (sample.barGraphRight[barIdx] / 2 * barsCanvas.height));
				renderContext.stroke();
			}
		}
	}

	toggleAudio(sample: SampleBarGraphData) {
		let sampleDOM = this.samples.find(s => s.nativeElement.getAttribute('url') == sample.sample.url);
		let audioPlayer = sampleDOM?.nativeElement.getElementsByClassName('sample-audio')[0] as HTMLAudioElement;
		audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();
	}

	formatSeconds(seconds: number) {
		let minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds) % 60;
		return (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
	}

	constructor(public backend: DocumentsBackendService) {
		effect(() => {
			const barCount = 30;
			let samples = backend.samples();
			this.sampleData = samples.map(s => {
				return {
					sample: s,
					playing: false,
					progress: 0,
					barGraphLeft: [],
					barGraphRight: []
				}
			});

			samples.forEach(sample => {
				fetch(sample.url).then(dat => dat.arrayBuffer()).then(buffer => {
					new AudioContext().decodeAudioData(buffer).then(audioBuffer => {
						let barGraphs = this.convertToBarGraph(audioBuffer, barCount);
						let barGraphLeft = barGraphs[0];
						let barGraphRight = barGraphs.length > 1 ? barGraphs[1] : barGraphs[0];

						this.sampleData = this.sampleData.filter(s => s.sample != sample);
						let sampleGraphs = {
							sample: sample,
							barGraphLeft: barGraphLeft,
							barGraphRight: barGraphRight,
							playing: false
						} as SampleBarGraphData;

						this.sampleData.push(sampleGraphs);
						this.renderBarGraph(sampleGraphs);
					});
				}).catch(err => {
					console.error("Error reading sample file!", sample, err);
				});
			});
		});
	}

	formatIdx(idx: number) {
		return (idx < 10 ? '0' : '') + (idx + 1);
	}

	timeUpdate(sample: SampleBarGraphData) {
		let sampleDOM = this.samples.find(s => s.nativeElement.getAttribute('url') == sample.sample.url);
		if (sampleDOM) {
			let controlBar = sampleDOM.nativeElement.getElementsByClassName('sample-player')[0] as HTMLCanvasElement;
			let controlBarKnob = sampleDOM.nativeElement.getElementsByClassName('sample-player-knob')[0] as HTMLCanvasElement;
			let audioPlayer = sampleDOM.nativeElement.getElementsByClassName('sample-audio')[0] as HTMLAudioElement;

			sample.progress = audioPlayer.currentTime / audioPlayer.duration;
			controlBarKnob.style.setProperty('--progress', (sample.progress * 100) + "%");
			controlBar.setAttribute('timestamp', this.formatSeconds(audioPlayer.currentTime));
			controlBar.setAttribute('duration', this.formatSeconds(audioPlayer.duration));
			this.renderBarGraph(sample);
		}
	}

	audioLoaded(sample: SampleBarGraphData) {
		let sampleDOM = this.samples.find(s => s.nativeElement.getAttribute('url') == sample.sample.url);
		if (sampleDOM) {
			let controlBar = sampleDOM.nativeElement.getElementsByClassName('sample-player')[0] as HTMLCanvasElement;
			let controlBarKnob = sampleDOM.nativeElement.getElementsByClassName('sample-player-knob')[0] as HTMLCanvasElement;
			let audioPlayer = sampleDOM.nativeElement.getElementsByClassName('sample-audio')[0] as HTMLAudioElement;

			controlBarKnob.style.setProperty('--progress', '0%');
			controlBar.setAttribute('timestamp', '0:00');
			controlBar.setAttribute('duration', this.formatSeconds(audioPlayer.duration));
		}
	}

	handleProgressBarMouseDown(event: PointerEvent) {
		event.preventDefault();

		let target = event.target as HTMLElement;
		while (!target.classList.contains('sample-player-cont')) {
			target = target.parentElement as HTMLElement;
		}

		this.draggedSample = target;
		this.activePointerId = event.pointerId;

		target.setPointerCapture(event.pointerId);
	}


	handleProgressBarMouseUp(event?: PointerEvent) {
		if (this.draggedSample && this.activePointerId !== null) {
			try {
				this.draggedSample.releasePointerCapture(this.activePointerId);
			} catch { }
		}

		this.draggedSample = undefined;
		this.activePointerId = null;
	}

	processTimeChangeEvent(event: PointerEvent) {
		event.preventDefault();
		let target: HTMLElement = event.target as HTMLElement;
		while (!(target as HTMLElement).classList.contains('sample-player-cont')) {
			target = (target.parentElement as HTMLElement);
		}

		let progressBar = (target as HTMLElement).getElementsByClassName("sample-player")[0];
		let audioPlayer = (target.parentElement as HTMLElement).getElementsByTagName("audio")[0];
		let clickXglobal = event.clientX;
		let barXglobal = progressBar.getBoundingClientRect().x;
		let xOffset = clickXglobal - barXglobal;
		let barWidth = target.getBoundingClientRect().width;

		let progress = xOffset / barWidth;
		if (progress >= 0 && progress <= 1) {
			audioPlayer.currentTime = audioPlayer.duration * progress;
		}
	}

	handleProgressBarDrag(event: PointerEvent) {
		if (!this.draggedSample) return;
		if (event.pointerId !== this.activePointerId) return;

		this.processTimeChangeEvent(event);
	}

	handleProgressBarClick(event: PointerEvent) {
		this.processTimeChangeEvent(event);
	}
}
