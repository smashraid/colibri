import { Component } from '@angular/core';
import { BlastList } from '../../components/blast-list/blast-list';
import { DesignComponent } from '../../../../shared/components/ui/design/design.component';

@Component({
  selector: 'app-blasts',
  imports: [BlastList, DesignComponent],
  templateUrl: './blasts.html',
  styleUrl: './blasts.scss',
})
export class Blasts {}
