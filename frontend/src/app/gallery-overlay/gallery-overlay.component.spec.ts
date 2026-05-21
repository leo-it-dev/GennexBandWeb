import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GalleryOverlayComponent } from './gallery-overlay.component';

describe('GalleryOverlayComponent', () => {
  let component: GalleryOverlayComponent;
  let fixture: ComponentFixture<GalleryOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GalleryOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
