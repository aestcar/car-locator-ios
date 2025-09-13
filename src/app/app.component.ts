import {
  Component,
  ElementRef,
  viewChild,
  signal,
  ChangeDetectionStrategy,
  AfterViewInit,
  OnInit,
  computed
} from '@angular/core';
import { LocationButtonsComponent } from './components/location-buttons/location-buttons.component';
import { PermissionScreenComponent } from './components/permission-screen/permission-screen.component';
import { SavedLocation } from './interfaces/saved-location.interface';
import { PURPLE_MARKER_SVG } from './constants/marker-icons';
import * as L from 'leaflet';
import { WHITE_MARKER_SVG } from './constants/white-marker-icon';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LocationButtonsComponent, PermissionScreenComponent, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, AfterViewInit {
  mapEl = viewChild<ElementRef<HTMLDivElement>>('map');

  #map?: L.Map;
  #currentLocationCircle?: L.Circle;
  #currentLocationDot?: L.CircleMarker;
  #savedLocationMarker?: L.Marker;

  hasCurrentLocation = signal(false);
  savedLocation = signal<SavedLocation | null>(null);
  hasSavedLocation = computed(() => !!this.savedLocation());
  permissionGranted = signal(false);
  locationError = signal<string | null>(null);

  ngOnInit(): void {
    this.#loadSavedLocation();
    this.#checkExistingPermission();
  }

  ngAfterViewInit(): void {
    if (this.permissionGranted() && !this.locationError()) {
      this.#initializeMap();
    }
  }

  onPermissionRequest(): void {
    if (!navigator.geolocation) {
      this.locationError.set('La geolocalización no está disponible en este dispositivo');
      this.permissionGranted.set(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.permissionGranted.set(true);
        this.locationError.set(null);
        setTimeout(() => {
          this.#initializeMap();
          this.#handleLocationSuccess(position);
          if (this.savedLocation()) {
            this.#addSavedLocationMarker();
          }
        }, 100);
      },
      (error) => {
        this.permissionGranted.set(true);
        this.#setLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  saveLocation(): void {
    if (!this.#currentLocationDot) {
      return;
    }

    const latLng = this.#currentLocationDot.getLatLng();
    const location = { lat: latLng.lat, lng: latLng.lng };

    this.savedLocation.set(location);
    this.#addSavedLocationMarker();
    localStorage.setItem('savedCarLocation', JSON.stringify(location));
  }

  redirectToGoogleMaps(location: { lat: number; lng: number }): void {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    window.location.href = googleMapsUrl;
  }

  #checkExistingPermission(): void {
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          if (permission.state === 'granted') {
            this.permissionGranted.set(true);
            setTimeout(() => {
              this.#initializeMap();
              this.#requestLocationPermission();
            }, 100);
          } else {
            this.permissionGranted.set(false);
          }
        })
        .catch(() => {
          this.permissionGranted.set(false);
        });
    } else {
      this.permissionGranted.set(false);
    }
  }

  #requestLocationPermission(): void {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.#handleLocationSuccess(position);
      },
      (error) => {
        this.#setLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  #handleLocationSuccess(position: GeolocationPosition): void {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    this.#map?.setView([lat, lng], 18);
    this.#addCurrentLocationIndicator(lat, lng);
    this.hasCurrentLocation.set(true);
  }

  #handleLocationError(error: GeolocationPositionError): void {
    this.#setLocationError(error);
  }

  #setLocationError(error: GeolocationPositionError): void {
    let errorMessage = 'No se ha podido obtener la ubicación';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Acceso a la ubicación denegado';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Ubicación no disponible';
        break;
      case error.TIMEOUT:
        errorMessage = 'Tiempo de espera agotado para obtener la ubicación';
        break;
    }

    this.locationError.set(errorMessage);
  }

  #initializeMap(): void {
    const mapElement = this.mapEl()?.nativeElement;
    if (!mapElement) return;

    this.#map = L.map(mapElement, {
      preferCanvas: true,
      zoomControl: false
    }).setView([40.4168, -3.7038], 16);

    L.control
      .zoom({
        position: 'bottomright'
      })
      .addTo(this.#map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    const savedLocation = this.savedLocation();
    if (savedLocation) {
      const whiteIcon = L.divIcon({
        html: WHITE_MARKER_SVG,
        className: 'custom-white-marker',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
      });

      L.marker([savedLocation.lat, savedLocation.lng], {
        icon: whiteIcon
      })
        .addTo(this.#map)
        .bindPopup('🚗 Última ubicación guardada del coche');

      this.#map.setView([savedLocation.lat, savedLocation.lng], 16);
    }
  }

  #addCurrentLocationIndicator(lat: number, lng: number): void {
    if (!this.#map) return;

    this.#currentLocationCircle = L.circle([lat, lng], {
      color: '#9c27b0',
      fillColor: '#9c27b0',
      fillOpacity: 0.15,
      weight: 2,
      radius: 20
    }).addTo(this.#map);

    this.#currentLocationDot = L.circleMarker([lat, lng], {
      color: '#ffffff',
      fillColor: '#9c27b0',
      fillOpacity: 1,
      weight: 2,
      radius: 8
    })
      .addTo(this.#map)
      .bindPopup('Tu ubicación actual');
  }

  #loadSavedLocation(): void {
    const saved = localStorage.getItem('savedCarLocation');
    if (saved) {
      try {
        const location = JSON.parse(saved);
        this.savedLocation.set(location);
      } catch (error) {
        localStorage.removeItem('savedCarLocation');
      }
    }
  }

  #addSavedLocationMarker(): void {
    if (!this.#map) return;

    const location = this.savedLocation();
    if (!location) return;

    if (this.#savedLocationMarker) {
      this.#map.removeLayer(this.#savedLocationMarker);
    }

    const purpleIcon = L.divIcon({
      html: PURPLE_MARKER_SVG,
      className: 'custom-purple-marker',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });

    this.#savedLocationMarker = L.marker([location.lat, location.lng], {
      icon: purpleIcon
    })
      .addTo(this.#map)
      .bindPopup('Ubicación del coche guardada');
  }
}
