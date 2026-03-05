import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmoothLoadImgComponent } from './smooth-load-img.component';

describe('SmoothLoadImgComponent', () => {
  let component: SmoothLoadImgComponent;
  let fixture: ComponentFixture<SmoothLoadImgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmoothLoadImgComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmoothLoadImgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
