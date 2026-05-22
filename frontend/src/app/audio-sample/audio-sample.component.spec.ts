import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioSampleComponent } from './audio-sample.component';

describe('AudioSampleComponent', () => {
  let component: AudioSampleComponent;
  let fixture: ComponentFixture<AudioSampleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudioSampleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AudioSampleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
