import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiamondImageMapComponent } from './diamond-image-map.component';

describe('HexagonImageMapComponent', () => {
  let component: DiamondImageMapComponent;
  let fixture: ComponentFixture<DiamondImageMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiamondImageMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiamondImageMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
