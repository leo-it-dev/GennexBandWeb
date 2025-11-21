import { TestBed } from '@angular/core/testing';

import { MP4FrameExtractionService } from './mp4-frame-extraction.service';

describe('MP4FrameExtractionService', () => {
  let service: MP4FrameExtractionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MP4FrameExtractionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
