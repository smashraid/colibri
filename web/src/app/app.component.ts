import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  BreakpointObserver,
  Breakpoints,
  BreakpointState,
} from '@angular/cdk/layout';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Header } from './shared/components/layout/header/header';
import { Navigation } from './shared/components/layout/navigation/navigation';
import { AppStore } from './app.store';
import { ProjectList } from './features/projects/components/project-list/project-list';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatProgressBarModule,
    MatSidenavModule,
    Header,
    Navigation,
    Header,
    ProjectList,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'Colibri';
  readonly store = inject(AppStore);
  private breakpointObserver = inject(BreakpointObserver);

  constructor() {}

  ngOnInit(): void {}

  handlePanelClick(emittedData: string, sideNav: MatSidenav) {
    this.store.toggleSidenav();
  }

  handleNavbarClick(emittedData: string, sideNav: MatSidenav) {
    this.store.closeSidenav();
  }
}
