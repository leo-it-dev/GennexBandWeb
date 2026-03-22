import { TestBed } from '@angular/core/testing';

import { PdfRenderService } from './pdf-render.service';

describe('PdfRenderService', () => {
  let service: PdfRenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfRenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
