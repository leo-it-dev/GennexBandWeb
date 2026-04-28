import { TestBed } from '@angular/core/testing';

import { MembersBackendService } from './members-backend.service';

describe('MembersBackendService', () => {
  let service: MembersBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MembersBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
