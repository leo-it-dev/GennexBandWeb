import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmoothLoadImgCanvasComponent } from './smooth-load-img-canvas.component';

describe('SmoothLoadImgCanvasComponent', () => {
  let component: SmoothLoadImgCanvasComponent;
  let fixture: ComponentFixture<SmoothLoadImgCanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmoothLoadImgCanvasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmoothLoadImgCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
