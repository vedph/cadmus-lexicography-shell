
import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';

@Component({
  selector: 'cadmus-home',
  imports: [RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  public readonly logged = signal<boolean>(false);;

  constructor(authService: AuthJwtService) {
    this.logged.set(authService.currentUserValue !== null);
  }
}
