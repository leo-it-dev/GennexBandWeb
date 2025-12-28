import { AfterViewInit, Component, computed, effect, ElementRef, Input, Renderer2, Signal, signal, ViewChild, WritableSignal } from '@angular/core';
import { SectionHeaderComponent } from '../section-header/section-header.component';

export class SlotScrollCommunication {
	stickyHeight: Signal<string> = signal("unset");
	scrollOffset: WritableSignal<number> = signal(0);
	scrollTop: WritableSignal<number> = signal(0);
	scrollBlockHeight: WritableSignal<number> = signal(0);
}

@Component({
	selector: 'app-slot',
	imports: [SectionHeaderComponent],
	templateUrl: './slot.component.html',
	styleUrl: './slot.component.scss'
})
export class SlotComponent implements AfterViewInit {

	@Input({ required: true })
	title: string = "";

	@Input({ required: false})
	oneLineText: string = "";

	@Input({ required: true })
	imgUrl: string = "";

	@ViewChild('itemContainer')
	private scrollBlockElement: ElementRef | undefined = undefined;

	@ViewChild('scrollContainer')
	private scrollContainerElement: ElementRef | undefined = undefined;

	@ViewChild('stickyBlock')
	private stickyBlockElement: ElementRef | undefined = undefined;

	@ViewChild('contentBlock')
	private contentBlockElement: ElementRef | undefined = undefined;

	@Input({required: false})
	scrollCommunication: SlotScrollCommunication = new SlotScrollCommunication();

	constructor(private renderer: Renderer2) {
		effect(() => {
			let off = -(this.scrollCommunication?.scrollOffset() ?? 0) + "px";
			if (this.scrollBlockElement) {
				this.renderer.setStyle(this.scrollBlockElement?.nativeElement, 'top', off);
			}
		});
	}

	ngAfterViewInit(): void {
		document.addEventListener("scroll", e => {
			e.preventDefault();
			let scrollContHeight = (this.scrollContainerElement?.nativeElement as HTMLElement).getBoundingClientRect().height;
			let stickyBlockHeight = ((this.stickyBlockElement?.nativeElement as HTMLElement).getBoundingClientRect().height);
			let stickyBlockTop = (this.stickyBlockElement?.nativeElement as HTMLElement).getBoundingClientRect().top;
			let scrollContainerTop = (this.scrollContainerElement?.nativeElement as HTMLElement).getBoundingClientRect().top;
			let scrollBlockHeight = (this.scrollBlockElement?.nativeElement as HTMLElement).getBoundingClientRect().height;
			let contentBlockHeight = (this.contentBlockElement?.nativeElement as HTMLElement).getBoundingClientRect().height;

			let scrollHeight = scrollContHeight - stickyBlockHeight;
			let scrollPos = stickyBlockTop - scrollContainerTop;

			let scrollPercentTop = Math.min(1.0, Math.max(0.0, scrollPos / scrollHeight));
			let scrollTop = scrollPercentTop * (scrollBlockHeight - contentBlockHeight);

			this.scrollCommunication?.scrollTop.set(scrollTop);
			this.scrollCommunication?.scrollBlockHeight.set(scrollBlockHeight);
		});
	}
}