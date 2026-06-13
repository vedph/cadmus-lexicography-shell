import { Component, OnInit, Inject, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { Thesaurus, ThesaurusEntry } from '@myrmidon/cadmus-core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';

// material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

// myrmidon
import { EnvService, RamStorageService } from '@myrmidon/ngx-tools';
import { AuthJwtService, GravatarPipe, User } from '@myrmidon/auth-jwt-login';
import { ThemeToggleComponent } from '@myrmidon/ngx-mat-tools';

// cadmus
import { AppRepository } from '@myrmidon/cadmus-state';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule,
    GravatarPipe,
    ThemeToggleComponent
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly _subs: Subscription[] = [];

  public readonly user = signal<User | undefined>(undefined);
  public readonly logged = signal<boolean>(false);
  public readonly itemBrowsers = signal<ThesaurusEntry[] | undefined>(undefined);
  public readonly version = signal<string>('');

  constructor(
    @Inject('itemBrowserKeys')
    private _itemBrowserKeys: { [key: string]: string },
    private _authService: AuthJwtService,
    private _appRepository: AppRepository,
    private _router: Router,
    env: EnvService,
    storage: RamStorageService,
  ) {
    this.version.set(env.get('version') || '');
  }

  public ngOnInit(): void {
    this.user.set(this._authService.currentUserValue || undefined);
    this.logged.set(this.user() !== undefined);

    // when the user logs in or out, reload the app data
    this._subs.push(
      this._authService.currentUser$.subscribe((user: User | null) => {
        this.logged.set(this._authService.isAuthenticated(true));
        this.user.set(user || undefined);
        if (user) {
          console.log('User logged in: ', user);
          this._appRepository.load();
        } else {
          console.log('User logged out');
        }
      }),
    );

    // when the thesaurus is loaded, get the item browsers
    this._subs.push(
      this._appRepository.itemBrowserThesaurus$.subscribe((thesaurus: Thesaurus | undefined) => {
        this.itemBrowsers.set(thesaurus ? thesaurus.entries : undefined);
      }),
    );
  }

  public ngOnDestroy(): void {
    this._subs.forEach((s) => s.unsubscribe());
  }

  public getItemBrowserRoute(id: string): string {
    return this._itemBrowserKeys[id] || id;
  }

  public logout(): void {
    if (!this.logged()) {
      return;
    }
    this._authService
      .logout()
      .pipe(take(1))
      .subscribe((_) => {
        this._router.navigate(['/home']);
      });
  }
}
