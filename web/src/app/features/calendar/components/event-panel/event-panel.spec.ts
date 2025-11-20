import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventPanel } from './event-panel';

describe('EventPanel', () => {
  let component: EventPanel;
  let fixture: ComponentFixture<EventPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
