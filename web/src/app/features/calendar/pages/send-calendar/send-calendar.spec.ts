import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendCalendar } from './send-calendar';

describe('SendCalendar', () => {
  let component: SendCalendar;
  let fixture: ComponentFixture<SendCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SendCalendar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
