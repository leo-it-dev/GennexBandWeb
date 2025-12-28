import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamplesSlotComponent } from './samples-slot.component';

describe('SamplesSlotComponent', () => {
  let component: SamplesSlotComponent;
  let fixture: ComponentFixture<SamplesSlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamplesSlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SamplesSlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
