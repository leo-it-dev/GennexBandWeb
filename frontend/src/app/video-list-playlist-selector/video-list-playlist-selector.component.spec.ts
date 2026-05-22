import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoListPlaylistSelectorComponent } from './video-list-playlist-selector.component';

describe('VideoListPlaylistSelectorComponent', () => {
  let component: VideoListPlaylistSelectorComponent;
  let fixture: ComponentFixture<VideoListPlaylistSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoListPlaylistSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoListPlaylistSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
