import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoListMobileSelectorComponent } from './video-list-mobile-selector.component';

describe('VideoListMobileSelectorComponent', () => {
  let component: VideoListMobileSelectorComponent;
  let fixture: ComponentFixture<VideoListMobileSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoListMobileSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoListMobileSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
