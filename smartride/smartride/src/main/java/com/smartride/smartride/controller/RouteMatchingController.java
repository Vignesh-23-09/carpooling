package com.smartride.smartride.controller;

import com.smartride.smartride.dto.RideMatchResponseDTO;
import com.smartride.smartride.service.RouteMatchingService;
import com.smartride.smartride.service.FareService;
import com.smartride.smartride.entity.VehicleType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/routes")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class RouteMatchingController {

    private final RouteMatchingService routeMatchingService;
    private final FareService fareService;

    public RouteMatchingController(RouteMatchingService routeMatchingService,
                                   FareService fareService) {
        this.routeMatchingService = routeMatchingService;
        this.fareService = fareService;
    }

    /**
     * Find matching rides using smart route matching algorithm
     * Supports:
     * - Direct matches (same source/destination)
     * - Partial matches (join along route)
     * - Flexible matches (nearby locations)
     */
    @PostMapping("/find-matches")
    public ResponseEntity<List<RideMatchResponseDTO>> findMatchingRides(
            @RequestParam String source,
            @RequestParam String destination,
            @RequestParam LocalDate date,
            @RequestParam(required = false) String vehicleType) {

        VehicleType type = null;
        if (vehicleType != null && !vehicleType.isEmpty()) {
            try {
                type = VehicleType.valueOf(vehicleType.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }

        List<RouteMatchingService.RideMatchResult> matchResults = 
            routeMatchingService.findMatchingRides(source, destination, date, type);

        List<RideMatchResponseDTO> responseList = matchResults.stream()
            .map(result -> {
                RideMatchResponseDTO dto = new RideMatchResponseDTO();
                dto.setRideId(result.getRide().getId());
                dto.setMatchType(result.getMatchType().name());
                dto.setMatchPercentage(result.getMatchPercentage());
                dto.setMatchQuality(result.getMatchQuality());
                dto.setDistanceKm(routeMatchingService.getDistanceKm(result.getRide()));
                dto.setEstimatedFare(fareService.calculateFarePerSeatForRide(result.getRide()));
                dto.setDriverName(result.getRide().getDriver().getName());
                dto.setCarModel(result.getRide().getCarModel());
                dto.setLicensePlate(result.getRide().getLicensePlate());
                dto.setVehicleType(result.getRide().getVehicleType() != null ? 
                    result.getRide().getVehicleType().name() : "STANDARD");
                dto.setAvailableSeats(result.getRide().getAvailableSeats());
                dto.setDriverRating(result.getRide().getDriver().getRating());
                dto.setSource(result.getRide().getSource());
                dto.setDestination(result.getRide().getDestination());
                return dto;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(responseList);
    }

    /**
     * Get detailed matching analysis for a specific ride
     */
    @GetMapping("/analyze/{rideId}")
    public ResponseEntity<RideMatchResponseDTO> analyzeRoute(@PathVariable Long rideId) {
        // Implementation would fetch ride and analyze it
        return ResponseEntity.ok(new RideMatchResponseDTO());
    }

    /**
     * Calculate cost split for ride-sharing scenario
     */
    @PostMapping("/calculate-split")
    public ResponseEntity<?> calculateCostSplit(
            @RequestParam Long rideId,
            @RequestParam Integer totalPassengers) {

        if (totalPassengers <= 0) {
            return ResponseEntity.badRequest().body("Passenger count must be greater than 0");
        }

        // Implement cost splitting logic here
        return ResponseEntity.ok().build();
    }
}
