import { TestBed } from '@angular/core/testing';

import { DocumentsBackendService } from './documents-backend.service';

describe('DocumentsBackendService', () => {
  let service: DocumentsBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentsBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
