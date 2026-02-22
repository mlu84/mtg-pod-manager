import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.scss',
})
export class MaintenanceComponent {
  readonly lastUpdated = 'February 2026';
}
