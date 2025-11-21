import { NgFor } from '@angular/common';
import { Component } from '@angular/core';

@Component({
	selector: 'app-gallery',
	imports: [NgFor],
	templateUrl: './gallery.component.html',
	styleUrl: './gallery.component.scss'
})
export class GalleryComponent {

	public images = [
		"/images/bandpic/20250802_202012.jpg",
		"/images/bandpic/20250802_210514.jpg",
		"/images/bandpic/20250802_210703.jpg",
		"/images/bandpic/20250802_212721.jpg",
		"/images/bandpic/20250802_213126.jpg",
		"/images/bandpic/20250802_220226.jpg",
		"/images/bandpic/20250802_220619.jpg",
		"/images/bandpic/20250802_221607.jpg",
		"/images/bandpic/20250802_221645.jpg",
		"/images/bandpic/20250802_221646.jpg",
		"/images/bandpic/20250802_221730.jpg",
		"/images/bandpic/20250802_221853.jpg",
		"/images/bandpic/20250802_221910.jpg",
		"/images/bandpic/20250802_221918.jpg",
		"/images/bandpic/20250802_222944.jpg",
		"/images/bandpic/wa1.jpg",
		"/images/bandpic/wa2.jpg",
	];
}
