import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LexLemmaPartEditor } from './lex-lemma-part-editor';

describe('LexLemmaPartEditor', () => {
  let component: LexLemmaPartEditor;
  let fixture: ComponentFixture<LexLemmaPartEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexLemmaPartEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LexLemmaPartEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
