import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
	selector: 'app-titlebar',
	imports: [],
	templateUrl: './titlebar.component.html',
	styleUrl: './titlebar.component.scss',
})
export class TitlebarComponent implements AfterViewInit {

	@ViewChild('titlebarShrinkTrigger')
	private trigger!: ElementRef<HTMLElement>;

	@ViewChild('titlebarFixed')
	private titlebar!: ElementRef<HTMLElement>;

	mobileNavExpanded = false;

	isMobile = false;

	constructor(private el: ElementRef<HTMLElement>) {}

	private observer = new IntersectionObserver((entries) => {
		let visible = entries[0].isIntersecting;
		if (visible) {
			this.titlebar.nativeElement.classList.remove('minimized');
		} else {
			this.titlebar.nativeElement.classList.add('minimized');
		}
	});

	ngAfterViewInit(): void {
		this.observer.observe(this.trigger.nativeElement);

		const mq = window.matchMedia('(max-width: 700px)'); // same value as variables.scss!!
		const update = () => {
			this.isMobile = mq.matches;
		};
		this.isMobile = mq.matches;
		mq.addEventListener('change', update);
	}

	navigate(event: Event) {
		const el = (event.target as HTMLElement).closest("a");
		const href = el?.getAttribute("href");
		if (href) {
			document.querySelector(href)?.scrollIntoView({behavior: 'smooth'});
		}
		this.mobileNavExpanded = false;
	}
}
