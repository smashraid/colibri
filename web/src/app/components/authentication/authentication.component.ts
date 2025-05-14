import {
  Component,
  computed,
  inject,
  Inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  MSAL_GUARD_CONFIG,
  MsalGuardConfiguration,
  MsalService,
  MsalBroadcastService,
  MsalModule,
} from '@azure/msal-angular';
import {
  EventMessage,
  InteractionStatus,
  RedirectRequest,
  PopupRequest,
  AuthenticationResult,
  EventType,
} from '@azure/msal-browser';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/internal/Subject';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { environment } from '../../../environments/environment';
import { AppStore } from '../../app.store';

type ProfileType = {
  givenName?: string;
  surname?: string;
  displayName?: string;
  userPrincipalName?: string;
  id?: string;
};

@Component({
  selector: 'app-authentication',
  imports: [MsalModule, MatButtonModule, MatIconModule],
  templateUrl: './authentication.component.html',
  styleUrl: './authentication.component.scss',
})
export class AuthenticationComponent implements OnInit, OnDestroy {
  isIframe = false;
  loginDisplay = signal(false);
  profile: ProfileType | undefined;
  private readonly _destroying$ = new Subject<void>();

  readonly store = inject(AppStore);

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.setLoginDisplay();

    this.authService.handleRedirectObservable().subscribe();

    this.isIframe = window !== window.parent && !window.opener; // Remove this line to use Angular Universal

    this.authService.instance.enableAccountStorageEvents(); // Optional - This will enable ACCOUNT_ADDED and ACCOUNT_REMOVED events emitted when a user logs in or out of another tab or window
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter(
          (msg: EventMessage) =>
            msg.eventType === EventType.ACCOUNT_ADDED ||
            msg.eventType === EventType.ACCOUNT_REMOVED
        )
      )
      .subscribe((result: EventMessage) => {
        if (this.authService.instance.getAllAccounts().length === 0) {
          window.location.pathname = '/';
        } else {
          this.setLoginDisplay();
        }
        console.log('msalSubject');
      });

    this.msalBroadcastService.msalSubject$
      .pipe(
        filter(
          (msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS
        ),
        takeUntil(this._destroying$)
      )
      .subscribe((result) => {
        const payload = result.payload as AuthenticationResult;
        this.formatUsername(payload.account.name);
        this.getProfile();
      });

    this.msalBroadcastService.inProgress$
      .pipe(
        filter(
          (status: InteractionStatus) => status === InteractionStatus.None
        ),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.setLoginDisplay();
        this.checkAndSetActiveAccount();
      });
  }

  setLoginDisplay() {
    this.loginDisplay.set(
      this.authService.instance.getAllAccounts().length > 0
    );
  }

  checkAndSetActiveAccount() {
    console.log('checkAndSetActiveAccount');
    /**
     * If no active account set but there are accounts signed in, sets first account to active account
     * To use active account set here, subscribe to inProgress$ first in your component
     * Note: Basic usage demonstrated. Your app may require more complicated account selection logic
     */
    let activeAccount = this.authService.instance.getActiveAccount();

    if (
      !activeAccount &&
      this.authService.instance.getAllAccounts().length > 0
    ) {
      let accounts = this.authService.instance.getAllAccounts();
      this.authService.instance.setActiveAccount(accounts[0]);
      console.log(accounts);
    }
  }

  loginRedirect() {
    if (this.msalGuardConfig.authRequest) {
      this.authService.loginRedirect({
        ...this.msalGuardConfig.authRequest,
      } as RedirectRequest);
    } else {
      this.authService.loginRedirect();
    }
  }

  loginPopup() {
    if (this.msalGuardConfig.authRequest) {
      this.authService
        .loginPopup({ ...this.msalGuardConfig.authRequest } as PopupRequest)
        .subscribe((response: AuthenticationResult) => {
          this.authService.instance.setActiveAccount(response.account);
        });
    } else {
      this.authService
        .loginPopup()
        .subscribe((response: AuthenticationResult) => {
          this.authService.instance.setActiveAccount(response.account);
        });
    }
  }

  logout(popup?: boolean) {
    this.store.updateUsername('');
    if (popup) {
      this.authService.logoutPopup({
        mainWindowRedirectUri: '/',
      });
    } else {
      this.authService.logoutRedirect();
    }
  }

  getProfile() {
    const url = environment.apiConfig.uri;
    this.http.get(url).subscribe((profile) => {
      const _profile = profile as ProfileType;
      const letters = `${_profile?.givenName
        ?.charAt(0)
        .toUpperCase()}${_profile?.surname?.charAt(0).toUpperCase()}`;
      this.store.updateUsername(letters);
    });
  }

  formatUsername(text?: string) {
    if (text) {
      const splitFullName = text.split(' ');
      const num = splitFullName.length;
      const letters = `${splitFullName[0]
        .charAt(0)
        .toUpperCase()}${splitFullName[num - 1].charAt(0).toUpperCase()}`;
      this.store.updateUsername(letters);
    }
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
