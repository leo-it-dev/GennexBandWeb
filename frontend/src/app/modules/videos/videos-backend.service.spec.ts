import { TestBed } from '@angular/core/testing';

import { VideosBackendService } from './videos-backend.service';

describe('VideosBackendService', () => {
  let service: VideosBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VideosBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
