import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordCollocTokenEditor } from './word-colloc-token-editor';

describe('WordCollocTokenEditor', () => {
  let component: WordCollocTokenEditor;
  let fixture: ComponentFixture<WordCollocTokenEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordCollocTokenEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordCollocTokenEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
