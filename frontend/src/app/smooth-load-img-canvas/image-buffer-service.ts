import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root',
})
export class ImageBufferService {

	private imageBuffer: { [key: string]: HTMLImageElement } = {};

	public async loadImage(urlSource: string): Promise<HTMLImageElement> {
		return new Promise((res, rej) => {
			if (urlSource in this.imageBuffer) {
				res(this.imageBuffer[urlSource]);
			} else {
				let img = new Image();
				img.onload = (() => {
					this.imageBuffer[urlSource] = img;
					res(img);
				});
				img.onerror = (() => {
					console.log("image log error: ", img);
					rej();
				});
				img.src = urlSource;
			}
		});
	}
}
