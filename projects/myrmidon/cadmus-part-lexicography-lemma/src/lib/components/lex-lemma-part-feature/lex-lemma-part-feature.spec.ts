import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LexLemmaPartFeature } from './lex-lemma-part-feature';

describe('LexLemmaPartFeature', () => {
  let component: LexLemmaPartFeature;
  let fixture: ComponentFixture<LexLemmaPartFeature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexLemmaPartFeature]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LexLemmaPartFeature);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
