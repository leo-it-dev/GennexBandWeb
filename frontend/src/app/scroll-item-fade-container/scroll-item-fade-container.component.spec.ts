import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScrollItemFadeContainerComponent } from './scroll-item-fade-container.component';

describe('ScrollItemFadeContainerComponent', () => {
  let component: ScrollItemFadeContainerComponent;
  let fixture: ComponentFixture<ScrollItemFadeContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScrollItemFadeContainerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScrollItemFadeContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
