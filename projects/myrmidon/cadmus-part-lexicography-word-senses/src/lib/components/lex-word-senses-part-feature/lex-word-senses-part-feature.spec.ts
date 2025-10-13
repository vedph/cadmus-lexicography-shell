import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LexWordSensesPartFeature } from './lex-word-senses-part-feature';

describe('WordSensesPartFeature', () => {
  let component: LexWordSensesPartFeature;
  let fixture: ComponentFixture<LexWordSensesPartFeature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexWordSensesPartFeature]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LexWordSensesPartFeature);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
