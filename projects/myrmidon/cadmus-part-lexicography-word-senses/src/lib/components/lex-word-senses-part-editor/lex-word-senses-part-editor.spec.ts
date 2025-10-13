import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LexWordSensesPartEditor } from './lex-word-senses-part-editor';

describe('WordSensesPartEditor', () => {
  let component: LexWordSensesPartEditor;
  let fixture: ComponentFixture<LexWordSensesPartEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexWordSensesPartEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LexWordSensesPartEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
