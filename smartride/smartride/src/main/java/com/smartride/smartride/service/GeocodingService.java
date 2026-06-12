package com.smartride.smartride.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class GeocodingService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    // Cache for geocoded coordinates to avoid repeated API calls
    private final Map<String, double[]> coordinateCache = new HashMap<>();

    // Known coordinates for major Indian cities (fallback data)
    private static final Map<String, double[]> KNOWN_CITIES = Map.ofEntries(
        Map.entry("Karur", new double[]{10.9577, 78.0711}),
        Map.entry("Coimbatore", new double[]{11.0168, 76.9558}),
        Map.entry("Paramathi Karur", new double[]{11.0652, 78.6500}),  // Paramathi is ~50km east of Karur
        Map.entry("Namakkal", new double[]{11.7186, 78.1667}),  // Namakkal, Tamil Nadu
        Map.entry("Kanchipuram", new double[]{12.8342, 79.7029}),  // Kanchipuram, Tamil Nadu
        Map.entry("Chennai", new double[]{13.0827, 80.2707}),
        Map.entry("Bangalore", new double[]{12.9716, 77.5946}),
        Map.entry("Hyderabad", new double[]{17.3850, 78.4867}),
        Map.entry("Delhi", new double[]{28.7041, 77.1025}),
        Map.entry("Mumbai", new double[]{19.0760, 72.8777}),
        Map.entry("Pune", new double[]{18.5204, 73.8567}),
        Map.entry("Jaipur", new double[]{26.9124, 75.7873}),
        Map.entry("Kolkata", new double[]{22.5726, 88.3639})
    );

    public GeocodingService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
        this.coordinateCache.putAll(KNOWN_CITIES);
    }

    /**
     * Get coordinates for a city name
     * Uses cache first, then Nominatim API, with fallback to known cities
     * Case-insensitive lookup
     */
    public double[] getCoordinates(String cityName) {
        if (cityName == null || cityName.trim().isEmpty()) {
            throw new RuntimeException("City name cannot be empty");
        }

        String normalizedCity = cityName.trim();
        System.out.println("=== GEOCODING START ===");
        System.out.println("Input city: " + normalizedCity);

        // Normalize to title case (e.g., "karur" -> "Karur")
        String titleCaseCity = normalizeToTitleCase(normalizedCity);
        System.out.println("Normalized city: " + titleCaseCity);

        // Check cache first (using title case)
        if (coordinateCache.containsKey(titleCaseCity)) {
            double[] cached = coordinateCache.get(titleCaseCity);
            System.out.println("✓ Using cached coordinates for " + titleCaseCity + ": (" + cached[0] + ", " + cached[1] + ")");
            System.out.println("=== GEOCODING END ===");
            return cached;
        }

        // Try fallback to known cities first (faster than API)
        if (KNOWN_CITIES.containsKey(titleCaseCity)) {
            double[] fallback = KNOWN_CITIES.get(titleCaseCity);
            coordinateCache.put(titleCaseCity, fallback);
            System.out.println("✓ Using fallback coordinates for " + titleCaseCity + ": (" + fallback[0] + ", " + fallback[1] + ")");
            System.out.println("=== GEOCODING END ===");
            return fallback;
        }

        // Try OSM Nominatim API as last resort
        try {
            System.out.println("Calling Nominatim API...");
            double[] coords = fetchFromNominatim(titleCaseCity);
            
            // Validate coordinates are within India bounds
            if (isValidIndianCoordinate(coords[0], coords[1])) {
                coordinateCache.put(titleCaseCity, coords);
                System.out.println("✓ Geocoded " + titleCaseCity + " via Nominatim: (" + coords[0] + ", " + coords[1] + ")");
                System.out.println("=== GEOCODING END ===");
                return coords;
            } else {
                System.err.println("✗ Invalid coordinates returned for " + titleCaseCity + ": (" + coords[0] + ", " + coords[1] + ")");
                throw new RuntimeException("Coordinates out of India bounds");
            }

        } catch (Exception e) {
            System.err.println("✗ Nominatim failed for " + titleCaseCity + ": " + e.getMessage());
            System.err.println("=== GEOCODING END ===");
            throw new RuntimeException("Failed to geocode city: " + normalizedCity, e);
        }
    }

    /**
     * Normalize city name to title case
     * "karur" -> "Karur", "COIMBATORE" -> "Coimbatore"
     */
    private String normalizeToTitleCase(String input) {
        if (input == null || input.isEmpty()) return input;
        String[] words = input.trim().split("\\s+");
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            if (i > 0) result.append(" ");
            String word = words[i];
            result.append(word.substring(0, 1).toUpperCase())
                  .append(word.substring(1).toLowerCase());
        }
        return result.toString();
    }

    /**
     * Fetch coordinates from OSM Nominatim API
     * Uses state and country context for better accuracy
     */
    private double[] fetchFromNominatim(String cityName) throws Exception {
        // Determine state based on city name for better accuracy
        String state = determineState(cityName);
        
        String query = state != null && !state.isEmpty() 
            ? cityName + ", " + state + ", India"
            : cityName + ", India";

        String url = String.format(
            "https://nominatim.openstreetmap.org/search?format=json&q=%s&limit=1",
            query.replace(" ", "+")
        );

        System.out.println("Nominatim Query: " + query);
        System.out.println("Nominatim URL: " + url);

        String response = restTemplate.getForObject(url, String.class);
        if (response == null) {
            throw new RuntimeException("Nominatim returned null response");
        }

        JsonNode root = objectMapper.readTree(response);

        if (!root.isArray() || root.size() == 0) {
            throw new RuntimeException("No results from Nominatim for: " + query);
        }

        JsonNode firstResult = root.get(0);
        double lat = firstResult.get("lat").asDouble();
        double lon = firstResult.get("lon").asDouble();

        if (lat == 0.0 && lon == 0.0) {
            throw new RuntimeException("Invalid coordinates returned from Nominatim");
        }

        System.out.println("Nominatim Result: " + query + " → (" + lat + ", " + lon + ")");
        return new double[]{lat, lon};
    }

    /**
     * Determine state for Indian cities
     * Helps Nominatim return more accurate results
     */
    private String determineState(String cityName) {
        String lower = cityName.toLowerCase();
        
        // Tamil Nadu cities
        if (lower.contains("karur") || lower.contains("coimbatore") || 
            lower.contains("paramathi") || lower.contains("salem") ||
            lower.contains("erode") || lower.contains("chennai") ||
            lower.contains("madurai") || lower.contains("trichy") ||
            lower.contains("namakkal") || lower.contains("kanchipuram")) {
            return "Tamil Nadu";
        }
        
        // Karnataka cities
        if (lower.contains("bangalore") || lower.contains("bengaluru") ||
            lower.contains("mysore") || lower.contains("mangalore")) {
            return "Karnataka";
        }
        
        // Telangana/Andhra Pradesh
        if (lower.contains("hyderabad") || lower.contains("vijayawada")) {
            return "Telangana";
        }
        
        // Delhi
        if (lower.contains("delhi")) {
            return "Delhi";
        }
        
        // Maharashtra
        if (lower.contains("mumbai") || lower.contains("pune") || 
            lower.contains("nagpur")) {
            return "Maharashtra";
        }
        
        // Default to empty (will use just city name + India)
        return "";
    }

    /**
     * Validate if coordinates are within India bounds
     * India: approximately 8.5°N to 35.5°N, 68.5°E to 97.5°E
     */
    private boolean isValidIndianCoordinate(double lat, double lon) {
        return lat >= 8.0 && lat <= 36.0 && lon >= 68.0 && lon <= 98.0;
    }

    /**
     * Clear coordinate cache (useful for testing)
     */
    public void clearCache() {
        coordinateCache.clear();
        coordinateCache.putAll(KNOWN_CITIES);
    }
}