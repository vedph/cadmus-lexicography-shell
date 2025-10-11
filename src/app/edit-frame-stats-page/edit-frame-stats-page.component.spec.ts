import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditFrameStatsPageComponent } from './edit-frame-stats-page.component';

describe('EditFrameStatsPageComponent', () => {
  let component: EditFrameStatsPageComponent;
  let fixture: ComponentFixture<EditFrameStatsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditFrameStatsPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditFrameStatsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
