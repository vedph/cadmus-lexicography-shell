import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordCollocLiteralEditor } from './word-colloc-literal-editor';

describe('WordCollocLiteralEditor', () => {
  let component: WordCollocLiteralEditor;
  let fixture: ComponentFixture<WordCollocLiteralEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordCollocLiteralEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordCollocLiteralEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
