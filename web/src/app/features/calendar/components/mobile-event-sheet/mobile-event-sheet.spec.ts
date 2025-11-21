import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileEventSheet } from './mobile-event-sheet';

describe('MobileEventSheet', () => {
  let component: MobileEventSheet;
  let fixture: ComponentFixture<MobileEventSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileEventSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileEventSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
