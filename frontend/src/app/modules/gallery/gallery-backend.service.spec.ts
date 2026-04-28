import { TestBed } from '@angular/core/testing';

import { GalleryBackendService } from './gallery-backend.service';

describe('GalleryBackendService', () => {
  let service: GalleryBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GalleryBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
