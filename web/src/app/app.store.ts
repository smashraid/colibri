import { computed, inject } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withProps,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { Observable, pipe } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { DatabaseService } from './core/services/database.service';
import { ProjectResponse } from './features/projects/models/project';
import {
  BreakpointObserver,
  Breakpoints,
  BreakpointState,
} from '@angular/cdk/layout';

type AppState = {
  isMobile: boolean;
  isTablet: boolean;
  isWeb: boolean;
  loading: boolean;
  projectId: number;
  username: string;
  useremail: string;
  projects: ProjectResponse[];
  isSidenavOpen: boolean;
};

const initialState: AppState = {
  isMobile: false,
  isTablet: false,
  isWeb: false,
  loading: false,
  projectId: 1,
  username: '',
  useremail: '',
  projects: [],
  isSidenavOpen: false,
};

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({})),
  withComputed(
    ({
      loading,
      projectId,
      username,
      useremail,
      isMobile,
      isTablet,
      isWeb,
    }) => ({
      selectProjectId: computed(() => projectId()),
      isScreenSmall: computed(() => isMobile() || isTablet()),
    })
  ),
  withMethods(
    (
      store,
      databaseService = inject(DatabaseService),
      msalService = inject(MsalService)
    ) => ({
      closeSidenav(): void {
        patchState(store, { isSidenavOpen: false });
      },
      toggleSidenav(): void {
        patchState(store, (state) => ({ isSidenavOpen: !state.isSidenavOpen }));
      },
      updateIsMobile(isMobile: boolean): void {
        patchState(store, { isMobile });
      },
      updateIsTablet(isTablet: boolean): void {
        patchState(store, { isTablet });
      },
      updateIsWeb(isWeb: boolean): void {
        patchState(store, { isWeb });
      },
      updateProject(id: number): void {
        patchState(store, (state) => ({ projectId: id }));
      },
      updateUsername(username: string): void {
        patchState(store, { username });
      },
      updateUseremail(useremail: string): void {
        patchState(store, { useremail });
      },
      startLoading(): void {
        patchState(store, { loading: true });
      },
      stopLoading(): void {
        patchState(store, { loading: false });
      },
      loaderOnNavigation: rxMethod<any>(
        pipe(
          tap((event) => {
            if (event instanceof NavigationStart) {
              patchState(store, { loading: true });
              if (store.isMobile()) {
                patchState(store, { isSidenavOpen: false });
              }
            } else if (
              event instanceof NavigationEnd ||
              event instanceof NavigationCancel ||
              event instanceof NavigationError
            ) {
              patchState(store, { loading: false });
            }
          })
        )
      ),
      loadProjects: rxMethod<void>(
        pipe(
          switchMap(() => {
            return databaseService.getProjects().pipe(
              tapResponse({
                next: (projects: ProjectResponse[]) =>
                  patchState(store, { projects }),
                error: (err: any) => {
                  console.log(err);
                },
              })
            );
          })
        )
      ),
      loadUsername(): void {
        const accountInfo: AccountInfo | null =
          msalService.instance.getActiveAccount();
        if (accountInfo && accountInfo.name) {
          const splitFullName = accountInfo.name.split(' ');
          const num = splitFullName.length;
          const letters = `${splitFullName[0]
            .charAt(0)
            .toUpperCase()}${splitFullName[num - 1].charAt(0).toUpperCase()}`;
          patchState(store, {
            useremail: accountInfo.username,
            username: letters,
          });
        } else {
          patchState(store, { useremail: '', username: '' });
        }
      },
    })
  ),
  withHooks(
    (
      store,
      router = inject(Router),
      breakpointObserver = inject(BreakpointObserver)
    ) => ({
      onInit() {
        store.loaderOnNavigation(router.events);
        store.loadProjects();
        store.loadUsername();

        breakpointObserver
          .observe([
            Breakpoints.XSmall,
            Breakpoints.Small,
            Breakpoints.Medium,
            Breakpoints.Large,
            Breakpoints.XLarge,
          ])
          .subscribe({
            next: (state: BreakpointState) => {
              console.log('BreakpointState', state);
              // Update the state directly using patchState from the store
              patchState(store, {
                isMobile: state.breakpoints[Breakpoints.XSmall],
                isTablet: state.breakpoints[Breakpoints.Small],
                isWeb:
                  state.breakpoints[Breakpoints.Medium] ||
                  state.breakpoints[Breakpoints.Large] ||
                  state.breakpoints[Breakpoints.XLarge],
              });
            },
          });
      },
    })
  )
);
