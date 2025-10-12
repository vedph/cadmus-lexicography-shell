import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordFormEditor } from './word-form-editor';

describe('WordFormEditor', () => {
  let component: WordFormEditor;
  let fixture: ComponentFixture<WordFormEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordFormEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordFormEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
