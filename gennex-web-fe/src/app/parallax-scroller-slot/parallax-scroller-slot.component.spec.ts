import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParallaxScrollerSlotComponent } from './parallax-scroller-slot.component';

describe('ParallaxScrollerSlotComponent', () => {
  let component: ParallaxScrollerSlotComponent;
  let fixture: ComponentFixture<ParallaxScrollerSlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParallaxScrollerSlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParallaxScrollerSlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
