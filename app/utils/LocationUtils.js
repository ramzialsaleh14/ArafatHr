import * as Location from 'expo-location';

// Office location coordinates (replace with actual office coordinates)
const OFFICE_LOCATION = {
    latitude: 31.99135691875033,
    longitude: 35.94845868212673,
};

const ALLOWED_DISTANCE = 150; // meters

/**
 * Get current user location with retry logic
 * @param {number} retries - Number of retries remaining (default: 5)
 */
export const getCurrentLocation = async (retries = 5) => {
    try {
        // Request permission
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Location permission not granted');
        }

        // Create a timeout promise (5 seconds)
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        // Race between getting location and timeout
        const location = await Promise.race([
            Location.getCurrentPositionAsync({
                enableHighAccuracy: true,
                accuracy: Location.Accuracy.Balanced,
            }),
            timeout,
        ]);

        if (location && location.coords) {
            const { latitude, longitude, accuracy } = location.coords;
            console.log('Current position:', `${latitude},${longitude}`, 'accuracy(m):', accuracy);

            return {
                latitude: latitude,
                longitude: longitude,
                accuracy: accuracy,
            };
        } else {
            throw new Error('Invalid position data');
        }
    } catch (error) {
        // Retry logic for timeout errors
        if (error.message === 'Timeout' && retries > 0) {
            console.log(`Timeout occurred, retrying getCurrentLocation (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            return await getCurrentLocation(retries - 1);
        }

        // Log and throw error for final failure
        console.error('Error getting location:', error);

        if (error.message.includes('permission')) {
            throw new Error('Location permission not granted');
        } else if (error.message.includes('Timeout') || error.message === 'Timeout') {
            throw new Error('Location request timed out');
        } else {
            throw new Error('Location unavailable');
        }
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
 * Check if user is within allowed distance from a specific office location
 */
export const isWithinOfficeRange = async (officeLocation = null, allowedDistance = 150) => {
    try {
        const currentLocation = await getCurrentLocation();

        // Use provided location or fall back to default
        const targetLocation = officeLocation || {
            latitude: 31.99135691875033,
            longitude: 35.94845868212673,
        };

        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            targetLocation.latitude,
            targetLocation.longitude
        );

        console.log(`Distance from office: ${distance.toFixed(2)} meters`);
        console.log(`Allowed distance: ${allowedDistance} meters`);

        return {
            isWithinRange: distance <= allowedDistance,
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

/**
 * Parse location string to coordinates object
 * Expects format: "latitude,longitude" or "latitude, longitude"
 */
export const parseLocation = (locationString) => {
    try {
        if (!locationString) return null;

        const coords = locationString.split(',').map(coord => parseFloat(coord.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            return {
                latitude: coords[0],
                longitude: coords[1]
            };
        }
        return null;
    } catch (error) {
        console.error('Error parsing location:', error);
        return null;
    }
};