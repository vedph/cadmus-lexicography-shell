import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LexWordCollocationPartEditor } from './lex-word-collocations-part-editor';

describe('LexWordCollocationPartEditor', () => {
  let component: LexWordCollocationPartEditor;
  let fixture: ComponentFixture<LexWordCollocationPartEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexWordCollocationPartEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LexWordCollocationPartEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
