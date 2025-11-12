import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbar } from '@angular/material/toolbar';

import { Authentication } from '../authentication/authentication';
import { ProjectList } from '../../../../features/projects/components/project-list/project-list';
import { AppStore } from '../../../../app.store';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-header',
  imports: [
    MatToolbar,
    MatSlideToggleModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatMenuModule,
    TitleCasePipe,
    RouterLink,
    ProjectList,
    Authentication,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  title = input<string>('');
  readonly store = inject(AppStore);
  protected themeService = inject(ThemeService);
}
