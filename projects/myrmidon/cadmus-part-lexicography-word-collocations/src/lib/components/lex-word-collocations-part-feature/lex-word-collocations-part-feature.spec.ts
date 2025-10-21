import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LexWordCollocationsPartFeature } from './lex-word-collocations-part-feature';

describe('LexWordCollocationsPartFeature', () => {
  let component: LexWordCollocationsPartFeature;
  let fixture: ComponentFixture<LexWordCollocationsPartFeature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexWordCollocationsPartFeature]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LexWordCollocationsPartFeature);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
