import { TestBed } from '@angular/core/testing';

import { CalendarBackendService } from './calendar-backend.service';

describe('CalendarBackendService', () => {
  let service: CalendarBackendService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalendarBackendService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
