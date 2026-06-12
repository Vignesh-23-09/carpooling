package com.smartride.smartride.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class OsrmDistanceService {

    private static final String OSRM_URL_TEMPLATE =
            "http://router.project-osrm.org/route/v1/driving/%f,%f;%f,%f?overview=false";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Haversine formula constants
    private static final double EARTH_RADIUS_KM = 6371.0;

    public OsrmDistanceService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Get distance in km using OSRM API with fallback to Haversine formula
     */
    public double getDistanceInKm(double originLat,
                                  double originLon,
                                  double destLat,
                                  double destLon) {
        try {
            return getDistanceFromOsrm(originLat, originLon, destLat, destLon);
        } catch (Exception e) {
            System.err.println("OSRM API failed: " + e.getMessage() + ". Falling back to Haversine formula.");
            return calculateHaversineDistance(originLat, originLon, destLat, destLon);
        }
    }

    /**
     * Call OSRM API and extract distance with sanity checks
     */
    private double getDistanceFromOsrm(double originLat,
                                       double originLon,
                                       double destLat,
                                       double destLon) {
        // Validate coordinates first
        validateCoordinates(originLat, originLon, "Origin");
        validateCoordinates(destLat, destLon, "Destination");

        // Calculate straight-line distance for comparison
        double straightLineKm = calculateHaversineDistance(originLat, originLon, destLat, destLon);
        System.out.println("=== DISTANCE CALCULATION ===");
        System.out.println("Origin: (" + originLat + ", " + originLon + ")");
        System.out.println("Destination: (" + destLat + ", " + destLon + ")");
        System.out.println("Straight-line distance (Haversine): " + String.format("%.2f", straightLineKm) + " km");

        // Format: lon,lat;lon,lat (OSRM expects longitude first)
        String url = String.format(OSRM_URL_TEMPLATE,
                originLon, originLat,
                destLon, destLat);

        System.out.println("OSRM Request URL: " + url);

        try {
            String json = restTemplate.getForObject(url, String.class);
            if (json == null) {
                throw new RuntimeException("OSRM returned empty response");
            }

            JsonNode root = objectMapper.readTree(json);
            
            // Check for OSRM error status
            String status = root.path("code").asText();
            if (!"Ok".equals(status)) {
                throw new RuntimeException("OSRM error: " + status + " - " + root.path("message").asText());
            }

            JsonNode routes = root.path("routes");
            if (!routes.isArray() || routes.size() == 0) {
                throw new RuntimeException("No route found in OSRM response");
            }

            // Extract distance in meters from first route
            double distanceMeters = routes.get(0).path("distance").asDouble();
            if (distanceMeters <= 0) {
                throw new RuntimeException("Invalid distance returned: " + distanceMeters);
            }

            double distanceKm = distanceMeters / 1000.0;
            System.out.println("OSRM Distance: " + String.format("%.2f", distanceKm) + " km");

            // Sanity check: OSRM distance should be 1.0x to 1.5x the straight-line distance
            // (roads follow curves, but shouldn't be wildly different)
            double ratio = distanceKm / straightLineKm;
            System.out.println("Distance Ratio (OSRM/Haversine): " + String.format("%.2f", ratio));

            if (ratio > 1.5) {
                System.err.println("WARNING: OSRM distance is " + ratio + "x the straight-line distance!");
                System.err.println("This suggests the route might be incorrect or incorrect coordinates.");
                System.err.println("Falling back to Haversine formula.");
                System.out.println("===========================");
                return straightLineKm;
            }

            System.out.println("===========================");
            return distanceKm;
            
        } catch (RestClientException e) {
            System.err.println("OSRM network error: " + e.getMessage());
            System.out.println("Falling back to Haversine: " + String.format("%.2f", straightLineKm) + " km");
            System.out.println("===========================");
            throw new RuntimeException("OSRM network error: " + e.getMessage(), e);
        } catch (Exception e) {
            System.err.println("Failed to parse OSRM response: " + e.getMessage());
            System.out.println("Falling back to Haversine: " + String.format("%.2f", straightLineKm) + " km");
            System.out.println("===========================");
            throw new RuntimeException("Failed to parse OSRM response: " + e.getMessage(), e);
        }
    }

    /**
     * Validate coordinates are within reasonable bounds
     */
    private void validateCoordinates(double lat, double lon, String label) {
        System.out.println(label + " Coordinates: lat=" + lat + ", lon=" + lon);
        
        // India bounds: 8°N to 36°N, 68°E to 98°E
        if (lat < 8.0 || lat > 36.0 || lon < 68.0 || lon > 98.0) {
            System.err.println("ERROR: " + label + " coordinates OUT OF INDIA BOUNDS!");
            System.err.println("  Expected: 8°N-36°N, 68°E-98°E");
            System.err.println("  Got: lat=" + lat + ", lon=" + lon);
            throw new RuntimeException("Invalid coordinates: " + label + " is outside India");
        }
    }

    /**
     * Haversine formula for great-circle distance between two points on Earth
     * Accurate within 0.5% for typical ride distances
     * 
     * @param lat1 Origin latitude
     * @param lon1 Origin longitude
     * @param lat2 Destination latitude
     * @param lon2 Destination longitude
     * @return Distance in kilometers
     */
    public double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distanceKm = EARTH_RADIUS_KM * c;

        System.out.println("Haversine distance (fallback): " + distanceKm + " km");
        return distanceKm;
    }
}

