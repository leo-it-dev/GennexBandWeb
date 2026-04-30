import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BigOverlayComponent } from './big-overlay.component';

describe('BigOverlayComponent', () => {
  let component: BigOverlayComponent;
  let fixture: ComponentFixture<BigOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BigOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BigOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
