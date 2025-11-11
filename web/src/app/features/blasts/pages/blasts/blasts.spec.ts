import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Blasts } from './blasts';

describe('Blasts', () => {
  let component: Blasts;
  let fixture: ComponentFixture<Blasts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Blasts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Blasts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
