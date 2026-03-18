import { TestBed } from '@angular/core/testing';

import { SubscribeBackendService } from './subscribe-backend.service';

describe('SubscribeBackendService', () => {
  let service: SubscibeBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubscribeBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
