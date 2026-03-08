import { TestBed } from '@angular/core/testing';

import { ContactBackendService } from './contact-backend.service';

describe('ContactBackendService', () => {
  let service: ContactBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
