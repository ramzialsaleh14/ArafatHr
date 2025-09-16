import * as Location from 'expo-location';

// Office location coordinates (replace with actual office coordinates)
const OFFICE_LOCATION = {
    latitude: 31.99135691875033,
    longitude: 35.94845868212673,
};

const ALLOWED_DISTANCE = 150; // meters

/**
 * Get current user location
 */
export const getCurrentLocation = async () => {
    try {
        // Request permission
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Location permission not granted');
        }

        // Get current location
        let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    } catch (error) {
        console.error('Error getting location:', error);
        throw error;
    }
};

/**
 * Calculate distance between two coordinates in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Check if user is within allowed distance from office
 */
export const isWithinOfficeRange = async () => {
    try {
        const currentLocation = await getCurrentLocation();

        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            OFFICE_LOCATION.latitude,
            OFFICE_LOCATION.longitude
        );

        console.log(`Distance from office: ${distance.toFixed(2)} meters`);

        return {
            isWithinRange: distance <= ALLOWED_DISTANCE,
            distance: Math.round(distance),
            location: currentLocation,
        };
    } catch (error) {
        console.error('Error checking office range:', error);
        throw error;
    }
};

/**
 * Format location for display
 */
export const formatLocation = (latitude, longitude) => {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};