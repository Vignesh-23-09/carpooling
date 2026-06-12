package com.smartride.smartride.service;

import org.springframework.stereotype.Service;

/**
 * Utility service for coordinate validation and distance checks
 */
@Service
public class CoordinateValidationService {

    /**
     * Validate if coordinates are within reasonable bounds for India
     * India roughly spans: 8.5°N to 35.5°N, 68.5°E to 97.5°E
     */
    public boolean isValidIndianCoordinate(double lat, double lon) {
        boolean validLat = lat >= 8.0 && lat <= 36.0;
        boolean validLon = lon >= 68.0 && lon <= 98.0;
        return validLat && validLon;
    }

    /**
     * Quick sanity check: if calculated distance is way off from Haversine,
     * something might be wrong
     */
    public boolean isDistanceReasonable(double osrmDistance, double haversineDistance) {
        // Allow up to 20% difference (OSRM follows roads, Haversine is great-circle)
        double ratio = osrmDistance / haversineDistance;
        return ratio >= 1.0 && ratio <= 1.3; // Roads are never shorter than straight line
    }

    /**
     * Get approximate straight-line distance using Haversine
     */
    public double getHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double EARTH_RADIUS_KM = 6371.0;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_KM * c;
    }

    /**
     * Log coordinate information for debugging
     */
    public void logCoordinateInfo(String source, double lat1, double lon1,
                                  String destination, double lat2, double lon2) {
        System.out.println("=== COORDINATES DEBUG INFO ===");
        System.out.println("From: " + source + " (" + lat1 + ", " + lon1 + ")");
        System.out.println("To: " + destination + " (" + lat2 + ", " + lon2 + ")");

        boolean sourceValid = isValidIndianCoordinate(lat1, lon1);
        boolean destValid = isValidIndianCoordinate(lat2, lon2);
        System.out.println("Source valid India coords: " + sourceValid);
        System.out.println("Destination valid India coords: " + destValid);

        double straightLineDistance = getHaversineDistance(lat1, lon1, lat2, lon2);
        System.out.println("Straight-line distance: " + String.format("%.2f", straightLineDistance) + " km");
        System.out.println("==============================");
    }
}
