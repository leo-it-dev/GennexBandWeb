import { TestBed } from '@angular/core/testing';

import { HcaptchaScriptLoaderService } from './hcaptcha-script-loader.service';

describe('HcaptchaScriptLoaderService', () => {
  let service: HcaptchaScriptLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HcaptchaScriptLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
