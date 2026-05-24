import * as maplibregl from 'maplibre-gl';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CalendarBackendService } from '../modules/calendar/calendar-backend.service';
import { ColoredSvgComponent } from '../colored-svg/colored-svg.component';
import { BigOverlayComponent } from '../big-overlay/big-overlay.component';

@Component({
	selector: 'app-calendar-list-overlay',
	imports: [ColoredSvgComponent, BigOverlayComponent],
	templateUrl: './calendar-list-overlay.component.html',
	styleUrl: './calendar-list-overlay.component.scss',
})
export class CalendarListOverlayComponent {

	@ViewChild('flyerScroll')
	private flyerScroll!: ElementRef<HTMLElement>;

	@ViewChild('map')
	set map(el: ElementRef<HTMLElement> | undefined) {
		if (el) {
			this.initMap(el);
		}
	}

	maplibregl!: maplibregl.Map;

	constructor(public calendar: CalendarBackendService) {

	}

	initMap(element: ElementRef<HTMLElement>) {
		let promises = Promise.allSettled([
			fetch(this.calendar.tileServerURL + "/europe"),
			fetch(this.calendar.tileServerURL + "/mapstyles/style.json")
		]);

		promises.then(async promises => {
			if (promises.find(p => p.status == 'rejected')) {
				console.error("Error reading in map data!");
			}
			if (promises[0].status == 'fulfilled' && promises[1].status == 'fulfilled') {
				let meta = await promises[0].value.json();
				let style = await promises[1].value.json();

				let maxZoom = meta["maxzoom"];
				let minZoom = meta["minzoom"];

				this.maplibregl = new maplibregl.Map({
					container: "left-img",
					style: style,
					attributionControl: false,
					maxZoom: maxZoom,
					minZoom: minZoom,
					zoom: maxZoom,
					center: [
						this.calendar.resolvedBigImage()?.entry.geocoding?.location.lon || 0,
						this.calendar.resolvedBigImage()?.entry.geocoding?.location.lat || 0,
					]
				});
				this.maplibregl.on('load', () => {
					this.addMarker(
						this.calendar.resolvedBigImage()?.entry.geocoding?.location.lat || 0,
						this.calendar.resolvedBigImage()?.entry.geocoding?.location.lon || 0);
				});
			}
		});
	}

	addMarker(lat: number, lon: number, color?: string, popupMessage?: string) {
		let marker = new maplibregl.Marker({
			color: color,
		}).setLngLat([lon, lat])

		if (popupMessage) {
			marker.setPopup(
				new maplibregl.Popup({
					className: 'maplibre-popup'
				}).setText(popupMessage)
			)
		}
		marker.addTo(this.maplibregl);
	}


	scrollLeft() {
		this.flyerScroll.nativeElement.scrollBy({
			left: -300,
			behavior: 'smooth'
		});
	}
	scrollRight() {
		this.flyerScroll.nativeElement.scrollBy({
			left: 300,
			behavior: 'smooth'
		});
	}

	open(url: string) {
		window.open(url, '_blank');
	}

	openMapsLink() {
		window.open("https://www.google.com/maps/search/?api=1&query=" + this.calendar.resolvedBigImage()?.entry.geocoding?.location.lat + "," + this.calendar.resolvedBigImage()?.entry.geocoding?.location.lon, "_blank");
	}

	formatDay(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { day: 'numeric' }).format(date);
	}

	formatDate(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { month: 'long', year: 'numeric' }).format(date);
	}
	formatDateFull(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
	}
	formatTime(date: Date) {
		return new Intl.DateTimeFormat("de-DE", { hour: '2-digit', minute: '2-digit', hour12: false }).format(date) + " Uhr";
	}

}
