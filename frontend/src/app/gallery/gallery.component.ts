import { AfterViewInit, Component, computed, ElementRef, QueryList, Signal, signal, ViewChild, ViewChildren, WritableSignal } from '@angular/core';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { SlotComponent } from '../slot/slot.component';
import { DiamondImageMapComponent } from '../diamond-image-map/diamond-image-map.component';

@Component({
	selector: 'app-gallery',
	imports: [SectionHeaderComponent, SlotComponent, DiamondImageMapComponent],
	templateUrl: './gallery.component.html',
	styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements AfterViewInit {

	@ViewChild('wrapper')
	wrapper?: ElementRef;

	@ViewChild('bigImageViewer')
	bigImageViewer?: ElementRef;

	@ViewChild('bigImage')
	bigImage?: ElementRef;

	public images: WritableSignal<{[key:string]: string}> = signal({});
	public thumbnailImageURLs: Signal<string[]> = computed(() => Object.keys(this.images()).map(name => this.thumbnailURLPath + "/" + name));

	public thumbnailURLPath = "";
	public bigURLPath = "";
	public showBigGallery = false;

	constructor(public elRef: ElementRef) {
	}

	setClass(obj: HTMLElement, className: string, set: boolean) {
		if (set && !obj.classList.contains(className)) {
			obj.classList.add(className);
		}
		if (!set && obj.classList.contains(className)) {
			obj.classList.remove(className);
		}
	}

	ngAfterViewInit(): void {

		fetch(document.location.origin + "/gallery", {
			method: "GET",
			headers: {
				'Accept': 'application/json'
			}
		}).then(async resp => resp.json()).then(galleryList => {
			let files: string[] = galleryList["files"];
			let thumbnails = galleryList["thumbnails"];
			let big = galleryList["big"];
			let thumbnailFormat = galleryList["thumbnailFormat"];
			this.thumbnailURLPath = thumbnails;
			this.bigURLPath = big;

			let imageMap: {[key:string]:string} = {};

			files.map(file => {
				let basename = file;
				let sepIdx = basename.lastIndexOf(".");
				let stem = basename.substring(0, sepIdx);

				let thumbnailURL = stem + "." + thumbnailFormat;
				let bigURL = basename;

				imageMap[thumbnailURL] = bigURL;
			});

			this.images.set(imageMap);
		});
	}

	openBigImage(url: string) {
		if (this.bigImageViewer && this.bigImage) {
			let thumbBaseName = new URL("https://" + location.host + url).pathname.split("/").pop();
			let bigFileName = this.images()[thumbBaseName ?? ""];
			(this.bigImageViewer.nativeElement as HTMLImageElement).src = "";
			setTimeout(() => {
				(this.bigImageViewer?.nativeElement as HTMLImageElement).src = this.bigURLPath + "/" + bigFileName;
				(this.bigImage?.nativeElement as HTMLElement).classList.add("showBigImage");
			}, 10);
		}
	}

	closeBigImage(evt: Event) {
		if (this.bigImage) {
			(this.bigImage.nativeElement as HTMLElement).classList.remove("showBigImage");
		}
	}

	openBigGallery() {
		this.showBigGallery = true;
	}
}
