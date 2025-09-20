import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationData {
  city: string;
  region?: string;
  country?: string;
}

export interface LocationState {
  isLoading: boolean;
  hasPermission: boolean | null;
  locationData: LocationData | null;
  error: string | null;
}

export const useLocationServices = () => {
  const [state, setState] = useState<LocationState>({
    isLoading: false,
    hasPermission: null,
    locationData: null,
    error: null,
  });

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      const hasPermission = status === 'granted';
      
      setState(prev => ({ 
        ...prev, 
        hasPermission, 
        isLoading: false,
        error: hasPermission ? null : 'Location permission denied'
      }));
      
      return hasPermission;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        hasPermission: false,
        error: 'Failed to request location permission'
      }));
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if we have permission
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          return null;
        }
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const address = geocode[0];
        const locationData: LocationData = {
          city: address.city || address.district || address.subregion || 'Unknown City',
          region: address.region,
          country: address.country,
        };

        setState(prev => ({
          ...prev,
          locationData,
          isLoading: false,
          hasPermission: true,
          error: null,
        }));

        return locationData;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Could not determine city from location'
        }));
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return null;
    }
  };

  const resetError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    ...state,
    requestLocationPermission,
    getCurrentLocation,
    resetError,
  };
};