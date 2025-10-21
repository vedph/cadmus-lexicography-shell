import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordCollocEditor } from './word-colloc-editor';

describe('WordCollocEditor', () => {
  let component: WordCollocEditor;
  let fixture: ComponentFixture<WordCollocEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordCollocEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordCollocEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
