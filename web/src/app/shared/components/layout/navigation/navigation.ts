import {
  Component,
  inject,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import {
  MatAccordion,
  MatExpansionModule,
  MatExpansionPanel,
} from '@angular/material/expansion';
import { MatNavList, MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { AppStore } from '../../../../app.store';

export interface NavLink {
  name: string;
  path: string;
  icon: string;
  isActive: boolean; // Keeping for data structure consistency, but won't be used for activation logic
  children: NavLink[];
}

@Component({
  selector: 'app-navigation',
  imports: [
    RouterLink,
    MatExpansionModule,
    MatNavList,
    MatListModule,
    MatIconModule,
    CommonModule,
  ],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
})
export class Navigation implements OnInit {
  accordion = viewChild.required(MatAccordion);

  // Data structure for the navigation links
  links = signal<NavLink[]>([
    {
      name: 'Home',
      path: '/',
      icon: 'home',
      isActive: true,
      children: [],
    },
    {
      name: 'Blasts',
      path: '/blasts',
      icon: 'article_person',
      isActive: false,
      children: [],
    },
    {
      name: 'Calendar',
      path: '/calendar',
      icon: 'calendar_month',
      isActive: false,
      children: [],
    },
  ]);

  readonly store = inject(AppStore);

  constructor(private router: Router) {}

  ngOnInit(): void {}

  isRouteActive(
    path: string,
    isChild: boolean = false,
    parentPath: string = ''
  ): boolean {
    const fullPath = isChild ? `${parentPath}/${path}` : path;
    const currentUrl = this.router.url;
    const cleanCurrentUrl = currentUrl.split('?')[0].split('#')[0];

    if (!isChild) {
      if (this.links().find((l) => l.path === path)?.children.length === 0) {
        return cleanCurrentUrl === fullPath;
      }
      return cleanCurrentUrl === fullPath;
    }

    return cleanCurrentUrl === fullPath;
  }

  isParentRouteActive(path: string): boolean {
    return this.router.url.startsWith(path) && path !== '/';
  }

  onMenuClick(): void {
    this.store.closeSidenav();
  }

  onSubMenuClick(): void {
    this.store.closeSidenav();
  }
}
