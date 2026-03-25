import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublishEventComponent } from './publish-event.component';

describe('PublishEventComponent', () => {
  let component: PublishEventComponent;
  let fixture: ComponentFixture<PublishEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublishEventComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublishEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
