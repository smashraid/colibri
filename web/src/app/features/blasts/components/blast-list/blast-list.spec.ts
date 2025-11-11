import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlastList } from './blast-list';

describe('BlastList', () => {
  let component: BlastList;
  let fixture: ComponentFixture<BlastList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlastList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlastList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
