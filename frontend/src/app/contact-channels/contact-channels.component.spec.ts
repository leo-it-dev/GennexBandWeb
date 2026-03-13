import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactChannelsComponent } from './contact-channels.component';

describe('ContactChannelsComponent', () => {
  let component: ContactChannelsComponent;
  let fixture: ComponentFixture<ContactChannelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactChannelsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactChannelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
