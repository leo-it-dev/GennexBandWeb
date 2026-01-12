import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicBackgroundImageComponent } from './dynamic-background-image.component';

describe('DynamicBackgroundImageComponent', () => {
  let component: DynamicBackgroundImageComponent;
  let fixture: ComponentFixture<DynamicBackgroundImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicBackgroundImageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicBackgroundImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
