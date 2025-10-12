import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordSenseExampleEditor } from './word-sense-example-editor';

describe('WordSenseExampleEditor', () => {
  let component: WordSenseExampleEditor;
  let fixture: ComponentFixture<WordSenseExampleEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordSenseExampleEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordSenseExampleEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
