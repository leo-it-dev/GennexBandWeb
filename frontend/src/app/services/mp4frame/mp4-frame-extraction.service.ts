import { Injectable } from '@angular/core';
import * as mp4box from 'mp4box';

@Injectable({
	providedIn: 'root'
})
export class MP4FrameExtractionService {

	constructor() { }

	private fetchMp4ArrayBuffer(url: string): Promise<ArrayBuffer> {
		return new Promise((res, rej) => {
			fetch(url).then((d) => d.arrayBuffer()).then(arrayBuffer => res(arrayBuffer)).catch(err => rej());
		});
	}

	private describeMp4Track(file: mp4box.ISOFile, track: mp4box.Track) {
		const trak = file.getTrackById(track.id);
		for (const entry of trak.mdia.minf.stbl.stsd.entries) {
			if (entry.boxes) {
				let box = entry.boxes.find(b => b.type == "avcC" || b.type == "hvcC" || b.type == "vpcC" || b.type == "av1C");
				if (box) {
					const stream = new mp4box.DataStream(undefined, 0, mp4box.Endianness.BIG_ENDIAN);
					box.write(stream);
					return new Uint8Array(stream.buffer, 8);  // Remove the box header.
				}
			}
		}
		throw new Error("avcC, hvcC, vpcC, or av1C box not found");
	}

	private samplesToVideoChunks(samples: mp4box.Sample[]): EncodedVideoChunk[] {
		let videoChunks = [];
		for (let sample of samples) {
			if (sample.data !== undefined) {
				videoChunks.push(new EncodedVideoChunk({
					type: sample.is_sync ? "key" : "delta",
					timestamp: 1e6 * sample.cts / sample.timescale,
					duration: 1e6 * sample.duration / sample.timescale,
					data: sample.data
				}));
			}
		}
		return videoChunks;
	}

	extractFramesFromMp4Video(url: string): Promise<VideoFrame[]> {
		return new Promise(async (res, rej) => {
			let videoFrames: VideoFrame[] = [];
			let expectedSamples = 0;
			let sampleCounter = 0;
			let arrayBuffer = await this.fetchMp4ArrayBuffer(url);
			const mp4boxFile = mp4box.createFile();

			const videoDecoder = new VideoDecoder({
				output(frame) {
					videoFrames.push(frame);

					if (sampleCounter >= expectedSamples && videoDecoder.decodeQueueSize == 0) {
						res(videoFrames);
					}
				},
				error(error) {
					rej("Error decoding video chunk!" + error);
				}
			});

			mp4boxFile.onReady = (info) => {
				console.log("mp4box file is ready!");
				mp4boxFile.setExtractionOptions(info.tracks[0].id);

				const track = info.tracks[0];
				if (track.video == undefined) {
					rej("Error decoding video info! First track video info is undefined!");
					return;
				}

				expectedSamples = track.nb_samples;
				console.log("expected sample count: ", expectedSamples);

				const config = {
					codec: track.codec.startsWith('vp08') ? 'vp8' : track.codec,
					codedHeight: track.video.height,
					codedWidth: track.video.width,
					description: this.describeMp4Track(mp4boxFile, track),
				};
				videoDecoder.configure(config);
				mp4boxFile.start();
			};

			mp4boxFile.onSamples = (id, user, samples) => {
				console.log("mp4box extracted sample!");
				this.samplesToVideoChunks(samples).forEach(videoChunk => videoDecoder.decode(videoChunk));
				sampleCounter += samples.length;
			};

			const mp4boxBuffer = mp4box.MP4BoxBuffer.fromArrayBuffer(arrayBuffer, 0);
			mp4boxFile.appendBuffer(mp4boxBuffer);
			mp4boxFile.flush();
		});
	}
}
