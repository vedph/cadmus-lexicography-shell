import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordCollocExampleEditor } from './word-colloc-example-editor';

describe('WordCollocExampleEditor', () => {
  let component: WordCollocExampleEditor;
  let fixture: ComponentFixture<WordCollocExampleEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordCollocExampleEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordCollocExampleEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
