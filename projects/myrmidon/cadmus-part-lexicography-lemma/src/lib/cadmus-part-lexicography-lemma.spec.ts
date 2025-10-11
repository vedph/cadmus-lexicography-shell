import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadmusPartLexicographyLemma } from './cadmus-part-lexicography-lemma';

describe('CadmusPartLexicographyLemma', () => {
  let component: CadmusPartLexicographyLemma;
  let fixture: ComponentFixture<CadmusPartLexicographyLemma>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadmusPartLexicographyLemma]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadmusPartLexicographyLemma);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
