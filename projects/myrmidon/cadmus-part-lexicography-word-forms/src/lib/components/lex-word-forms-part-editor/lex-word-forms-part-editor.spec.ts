import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LexWordFormsPartEditor } from './lex-word-forms-part-editor';

describe('LexWordFormsPartEditor', () => {
  let component: LexWordFormsPartEditor;
  let fixture: ComponentFixture<LexWordFormsPartEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexWordFormsPartEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LexWordFormsPartEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
