import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordSenseEditor } from './word-sense-editor';

describe('WordSenseEditor', () => {
  let component: WordSenseEditor;
  let fixture: ComponentFixture<WordSenseEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordSenseEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordSenseEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
