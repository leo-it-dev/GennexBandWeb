import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarListOverlayComponent } from './calendar-list-overlay.component';

describe('CalendarListOverlayComponent', () => {
  let component: CalendarListOverlayComponent;
  let fixture: ComponentFixture<CalendarListOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarListOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarListOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
