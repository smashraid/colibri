import { Component, EventEmitter, inject, OnInit } from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatSelectChange, MatSelectModule} from '@angular/material/select';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import { Observable } from 'rxjs/internal/Observable';
import { AsyncPipe, CommonModule } from '@angular/common';


import { AppStore } from '../../app.store';
import { DatabaseService } from '../../services/database.service';
import { ProjectRead } from '../../view-models/project/projectRead.model';

@Component({
  selector: 'app-projects',
  imports: [MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatMenuModule, FormsModule, ReactiveFormsModule, CommonModule, AsyncPipe],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  readonly store = inject(AppStore);
  private databaseService = inject(DatabaseService);
  
  projects$ !: Observable<ProjectRead[]>;
  panelColor = new FormControl('red');
  
  ngOnInit(): void {
    this.projects$ = this.databaseService.getProjects();
    this.store.loadProjects('');
  }

  onSelect(event: MatSelectChange){
    console.log(event);
  }
}
