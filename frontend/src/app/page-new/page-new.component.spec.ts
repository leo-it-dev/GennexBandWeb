import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageNewComponent } from './page-new.component';

describe('PageNewComponent', () => {
  let component: PageNewComponent;
  let fixture: ComponentFixture<PageNewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageNewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
