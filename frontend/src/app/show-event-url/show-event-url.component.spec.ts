import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowEventURLComponent } from './show-event-url.component';

describe('ShowEventURLComponent', () => {
  let component: ShowEventURLComponent;
  let fixture: ComponentFixture<ShowEventURLComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowEventURLComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShowEventURLComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
