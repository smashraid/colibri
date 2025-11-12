import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { AppStore } from '../../../../app.store';
import { DatabaseService } from '../../../../core/services/database.service';
import { ProjectResponse } from '../../models/project';
import { instanceOf } from '../../../../shared/utils';
import { tap } from 'rxjs/internal/operators/tap';
import { startWith } from 'rxjs/internal/operators/startWith';
import { map } from 'rxjs/internal/operators/map';

@Component({
  selector: 'app-project-list',
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
  ],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
})
export class ProjectList {
  readonly store = inject(AppStore);
  readonly databaseService = inject(DatabaseService);

  projectControl = new FormControl<string | ProjectResponse>('');

  private projects$ = this.databaseService.getProjects().pipe(
    tap((projects) => {
      const currentProject = projects.find(
        (p) => p.id === this.store.projectId()
      );
      if (currentProject) {
        this.projectControl.setValue(currentProject);
      }
    })
  );
  projects = toSignal(this.projects$, { initialValue: [] });

  private filterValue = toSignal(
    this.projectControl.valueChanges.pipe(
      startWith(''),
      map((value) => (typeof value === 'string' ? value : value?.name))
    )
  );

  filteredList = computed(() => {
    const filter = this.filterValue()?.toLowerCase() || '';
    const allProjects = this.projects();
    if (!filter) {
      return allProjects;
    }
    return allProjects.filter((project) =>
      project.name.toLowerCase().includes(filter)
    );
  });

  displayFn(project: ProjectResponse): string {
    return project && project.name
      ? project.name.replace('.com', '').toUpperCase()
      : '';
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const selectedProject = event.option.value as ProjectResponse;
    this.store.updateProject(selectedProject.id);
  }

  onInputBlur(): void {
    const controlValue = this.projectControl.value;
    const isValueSelected =
      typeof controlValue === 'object' && controlValue !== null;

    if (!isValueSelected) {
      const storedProjectId = this.store.projectId();
      const allProjects = this.projects();

      const projectToResetTo = allProjects.find(
        (p) => p.id === storedProjectId
      );

      if (projectToResetTo) {
        this.projectControl.setValue(projectToResetTo, { emitEvent: false });
      } else {
        this.projectControl.setValue('', { emitEvent: false });
      }
    }
  }
}
