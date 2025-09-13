import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SavedLocation } from '../../interfaces/saved-location.interface';

@Component({
  selector: 'app-location-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './location-buttons.component.html',
  styleUrl: './location-buttons.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationButtonsComponent {
  hasCurrentLocation = input.required<boolean>();
  hasSavedLocation = input.required<boolean>();
  savedLocation = input<SavedLocation | null>(null);

  saveLocationClick = output<void>();
  recoverLocationClick = output<SavedLocation>();

  onSaveLocation(): void {
    this.saveLocationClick.emit();
  }

  onRecoverLocation(): void {
    const location = this.savedLocation();
    if (location) {
      this.recoverLocationClick.emit(location);
    }
  }
}
