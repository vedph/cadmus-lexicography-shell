import { Component, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { EditFrameStatsComponent } from '@myrmidon/cadmus-statistics';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-edit-frame-stats-page',
  imports: [MatCardModule, MatIcon, EditFrameStatsComponent],
  templateUrl: './edit-frame-stats-page.component.html',
  styleUrl: './edit-frame-stats-page.component.scss',
})
export class EditFrameStatsPageComponent {
  public readonly startDate = signal<Date>(
    new Date(new Date().setDate(new Date().getDate() - 7))
  );
  public readonly endDate = signal<Date>(new Date());

  constructor() {
    const startDate = this.startDate();
    startDate.setHours(0, 0, 0, 0);
    this.startDate.set(startDate);
  }
}
