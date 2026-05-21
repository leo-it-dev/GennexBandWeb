import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoListVideoSelectorComponent } from './video-list-video-selector.component';

describe('VideoListVideoSelectorComponent', () => {
  let component: VideoListVideoSelectorComponent;
  let fixture: ComponentFixture<VideoListVideoSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoListVideoSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoListVideoSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
