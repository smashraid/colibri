import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { AppStore } from '../../app.store';
import { ProjectRead } from '../../view-models/project/projectRead.model';

import { instanceOf } from '../../shared/utils';
import { startWith } from 'rxjs/internal/operators/startWith';
import { map } from 'rxjs/internal/operators/map';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-projects',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatMenuModule,
    MatAutocompleteModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    JsonPipe,
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent implements OnInit {
  readonly store = inject(AppStore);
  readonly databaseService = inject(DatabaseService);
  projectId = new FormControl();
  projects = signal<ProjectRead[]>([]);
  filteredList = signal<ProjectRead[]>([]);

  ngOnInit(): void {
    this.projectId.valueChanges.subscribe((value) => {
      this._filter(value);
    });

    this.databaseService.getProjects().subscribe((projectsDb) => {
      this.projects.set(projectsDb);
      this.filteredList.set(projectsDb);
      this.projectId.setValue(
        projectsDb.find((p) => p.id == this.store.projectId())
      );
    });
  }

  onSelect(event: MatSelectChange) {
    this.store.updateProject(event.value);
  }

  displayFn(project: ProjectRead): string {
    let displayValue = '';
    if (project && project.website) {
      //this.store.updateProject(project.id);
      displayValue = project.website.replace('.com', '').toUpperCase();
    }
    return displayValue;
  }

  private _filter(value: string | ProjectRead | null): void {
    let filterValue = '';
    let result: ProjectRead[] = this.store.projects().slice();
    if (typeof value === 'string' && value !== '') {
      filterValue = value.toLowerCase();
      result = this.store
        .projects()
        .filter((option) => option.website.toLowerCase().includes(filterValue));
    } else if (value && instanceOf<ProjectRead>(value, 'website')) {
      this.store.updateProject(value.id);
      result = [value];
    }
    this.filteredList.update((prev) => result);
  }
}
