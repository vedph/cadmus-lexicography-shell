import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordFormSetEditor } from './word-form-set-editor';

describe('WordFormSetEditor', () => {
  let component: WordFormSetEditor;
  let fixture: ComponentFixture<WordFormSetEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordFormSetEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordFormSetEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
