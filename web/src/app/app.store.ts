import { inject } from '@angular/core';
import {
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { DatabaseService } from './services/database.service';

import { ProjectRead } from './view-models/project/projectRead.model';

type AppState = {
  loading: boolean;
  projectId: number | null;
  username: string;
  projects: ProjectRead[];
};

const initialState: AppState = {
  loading: false,
  projectId: null,
  username: '',
  projects: [],
};

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ loading, projectId, username }) => ({})),
  withMethods((store, databaseService = inject(DatabaseService)) => ({
    updateProject(id: number): void {
      patchState(store, (state) => ({ projectId: id }));
    },
    updateUsername(username: string): void {
      patchState(store, { username });
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
          } else if (
            event instanceof NavigationEnd ||
            event instanceof NavigationError
          ) {
            patchState(store, { loading: false });
          }
        })
      )
    ),
    loadProjects: rxMethod<string>(
      pipe(
        switchMap(() => {
          return databaseService.getProjects().pipe(
            tapResponse({
              next: (projects: ProjectRead[]) => patchState(store, { projects }),
              error: (err: any) => {
                console.log(err);
              },
            })
          );
        })
      )
    ),
  })),
  withHooks((store, router = inject(Router)) => ({
    onInit() {
      store.loaderOnNavigation(router.events);
    },
  }))
);
