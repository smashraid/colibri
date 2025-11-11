import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddBlast } from './add-blast';

describe('AddBlast', () => {
  let component: AddBlast;
  let fixture: ComponentFixture<AddBlast>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddBlast]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddBlast);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
