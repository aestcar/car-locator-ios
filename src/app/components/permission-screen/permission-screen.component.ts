import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-permission-screen',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './permission-screen.component.html',
  styleUrl: './permission-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionScreenComponent {
  requestPermission = output<void>();

  onRequestPermission(): void {
    this.requestPermission.emit();
  }
}
