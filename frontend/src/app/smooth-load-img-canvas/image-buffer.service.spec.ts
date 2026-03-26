import { TestBed } from '@angular/core/testing';

import { ImageBufferService } from './image-buffer-service';

describe('ImageBufferService', () => {
  let service: ImageBufferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageBufferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
