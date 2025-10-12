import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LexWordFormsPartFeature } from './lex-word-forms-part-feature';

describe('LexWordFormsPartFeature', () => {
  let component: LexWordFormsPartFeature;
  let fixture: ComponentFixture<LexWordFormsPartFeature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexWordFormsPartFeature]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LexWordFormsPartFeature);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
