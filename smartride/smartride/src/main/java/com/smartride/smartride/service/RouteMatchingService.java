package com.smartride.smartride.service;

import com.smartride.smartride.entity.Ride;
import com.smartride.smartride.entity.RideStatus;
import com.smartride.smartride.entity.VehicleType;
import com.smartride.smartride.repository.RideRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RouteMatchingService {

    private final RideRepository rideRepository;
    private final GeocodingService geocodingService;
    private final OsrmDistanceService osrmDistanceService;

    // Matching constants (in kilometers)
    private static final double DIRECT_MATCH_RADIUS = 0.5; // 500 meters for direct matches
    private static final double PARTIAL_MATCH_RADIUS = 2.0; // 2 km for partial/partial matches
    private static final double ROUTE_DEVIATION_THRESHOLD = 1.5; // Maximum deviation from direct route

    public RouteMatchingService(RideRepository rideRepository,
                               GeocodingService geocodingService,
                               OsrmDistanceService osrmDistanceService) {
        this.rideRepository = rideRepository;
        this.geocodingService = geocodingService;
        this.osrmDistanceService = osrmDistanceService;
    }

    /**
     * Smart route matching algorithm that finds the best matching rides:
     * 1. Direct Matches: Exact source/destination match or very close
     * 2. Partial Matches: Passenger can join along the driver's route
     */
    @Transactional(readOnly = true)
    public List<RideMatchResult> findMatchingRides(String passengerSource, String passengerDestination,
                                                    LocalDate date, VehicleType vehicleType) {
        System.out.println("\n╔════════════════════════════════════════════╗");
        System.out.println("║  ROUTE MATCHING START");
        System.out.println("║  From: " + passengerSource + " → To: " + passengerDestination);
        System.out.println("║  Date: " + date);
        System.out.println("║  Vehicle Type: " + (vehicleType != null ? vehicleType : "Any"));
        System.out.println("╚════════════════════════════════════════════╝");

        double[] passengerSrc = geocodingService.getCoordinates(passengerSource);
        double[] passengerDst = geocodingService.getCoordinates(passengerDestination);

        System.out.println("Passenger source coords: (" + passengerSrc[0] + ", " + passengerSrc[1] + ")");
        System.out.println("Passenger dest coords: (" + passengerDst[0] + ", " + passengerDst[1] + ")");

        // Get all available rides for the date
        List<Ride> availableRides = rideRepository.findByDateAndStatus(date, RideStatus.PENDING);
        System.out.println("Found " + availableRides.size() + " available rides for date: " + date);

        // Filter by vehicle type if specified
        if (vehicleType != null) {
            availableRides = availableRides.stream()
                    .filter(r -> r.getVehicleType() == vehicleType)
                    .collect(Collectors.toList());
            System.out.println("After filtering by vehicle type: " + availableRides.size() + " rides");
        }

        // Analyze each ride for route compatibility
        List<RideMatchResult> matches = new ArrayList<>();
        for (Ride ride : availableRides) {
            RideMatchResult result = analyzeRouteMatch(ride, passengerSrc, passengerDst);
            if (result != null) {
                matches.add(result);
                System.out.println("✓ Route Match Found - Type: " + result.getMatchType() + 
                                 ", Coverage: " + String.format("%.1f%%", result.getMatchPercentage() * 100));
            }
        }

        // Sort by match quality
        List<RideMatchResult> sortedMatches = matches.stream()
                .sorted(Comparator
                        .comparing(RideMatchResult::getMatchQuality).reversed()
                        .thenComparing(RideMatchResult::getRouteCost))
                .collect(Collectors.toList());

        System.out.println("\n╔════════════════════════════════════════════╗");
        System.out.println("║  ROUTE MATCHING COMPLETE");
        System.out.println("║  Total Matches Found: " + sortedMatches.size());
        System.out.println("╚════════════════════════════════════════════╝\n");

        return sortedMatches;
    }

    /**
     * Analyze a specific ride against passenger's source and destination
     */
    private RideMatchResult analyzeRouteMatch(Ride ride, double[] passengerSrc, double[] passengerDst) {
        double rideSrcLat = ride.getPickupLat();
        double rideSrcLon = ride.getPickupLon();
        double rideDestLat = ride.getDropLat();
        double rideDestLon = ride.getDropLon();

        // Check for DIRECT MATCH
        double distSrcToRideSrc = osrmDistanceService.getDistanceInKm(
                passengerSrc[0], passengerSrc[1], rideSrcLat, rideSrcLon);
        double distDestToRideDest = osrmDistanceService.getDistanceInKm(
                passengerDst[0], passengerDst[1], rideDestLat, rideDestLon);

        if (distSrcToRideSrc <= DIRECT_MATCH_RADIUS && distDestToRideDest <= DIRECT_MATCH_RADIUS) {
            return new RideMatchResult(
                    ride.getId(),
                    MatchType.DIRECT_MATCH,
                    1.0, // 100% match
                    10, // Highest quality score
                    0, // No deviation
                    ride
            );
        }

        // Check for PARTIAL MATCH
        // Calculate if passenger can join along the driver's route
        double distPassengerSrcToRideSrc = osrmDistanceService.getDistanceInKm(
                passengerSrc[0], passengerSrc[1], rideSrcLat, rideSrcLon);
        double distPassengerDestToRideDest = osrmDistanceService.getDistanceInKm(
                passengerDst[0], passengerDst[1], rideDestLat, rideDestLon);
        double distRideSrcToRideDest = osrmDistanceService.getDistanceInKm(
                rideSrcLat, rideSrcLon, rideDestLat, rideDestLon);
        double distPassengerSrcToPassengerDest = osrmDistanceService.getDistanceInKm(
                passengerSrc[0], passengerSrc[1], passengerDst[0], passengerDst[1]);

        // Passenger can join if:
        // 1. Pickup is reasonably close to driver's route
        // 2. Dropoff is reasonably close to driver's destination
        // 3. Doesn't cause excessive detour
        if (distPassengerSrcToRideSrc <= PARTIAL_MATCH_RADIUS && 
            distPassengerDestToRideDest <= PARTIAL_MATCH_RADIUS) {

            // Calculate route deviation
            double totalDetour = distPassengerSrcToRideSrc + distPassengerDestToRideDest;
            double directDistance = distPassengerSrcToPassengerDest;
            double deviation = totalDetour;

            if (totalDetour <= ROUTE_DEVIATION_THRESHOLD * directDistance && deviation <= 1.5) {
                double matchPercentage = Math.max(0.5, 1.0 - (totalDetour / (directDistance * 2.0)));
                int qualityScore = (int) (6 + (matchPercentage * 3)); // Score between 6-9

                return new RideMatchResult(
                        ride.getId(),
                        MatchType.PARTIAL_MATCH,
                        matchPercentage,
                        qualityScore,
                        deviation,
                        ride
                );
            }
        }

        // Check for FLEXIBLE MATCH (wider criteria for areas with fewer rides)
        if (distPassengerSrcToRideSrc <= 3.0 && distPassengerDestToRideDest <= 3.0) {
            double matchPercentage = 1.0 - Math.min(1.0, (distPassengerSrcToRideSrc + distPassengerDestToRideDest) / 6.0);

            return new RideMatchResult(
                    ride.getId(),
                    MatchType.FLEXIBLE_MATCH,
                    matchPercentage,
                    Math.max(3, (int) (matchPercentage * 5)),
                    distPassengerSrcToRideSrc + distPassengerDestToRideDest,
                    ride
            );
        }

        return null;
    }

    /**
     * Calculate cost difference for passenger in a ride with other passengers
     */
    public double calculateCostWithSharing(Ride ride, int totalPassengers) {
        double distanceKm = osrmDistanceService.getDistanceInKm(
                ride.getPickupLat(),
                ride.getPickupLon(),
                ride.getDropLat(),
                ride.getDropLon()
        );
        double baseFare = ride.getBaseFare();
        double pricePerKm = ride.getFarePerKm();
        double totalCost = baseFare + (distanceKm * pricePerKm);
        
        // Split cost proportionally based on distance
        return totalCost / totalPassengers;
    }

    /**
     * Get distance for a ride
     */
    public double getDistanceKm(Ride ride) {
        return osrmDistanceService.getDistanceInKm(
                ride.getPickupLat(),
                ride.getPickupLon(),
                ride.getDropLat(),
                ride.getDropLon()
        );
    }

    // Getters
    public static class RideMatchResult {
        private Long rideId;
        private MatchType matchType;
        private double matchPercentage; // 0.0 to 1.0
        private int matchQuality; // 1-10 (higher is better)
        private double routeCost; // Cost in km or time
        private Ride ride;

        public RideMatchResult(Long rideId, MatchType matchType, double matchPercentage, 
                              int matchQuality, double routeCost, Ride ride) {
            this.rideId = rideId;
            this.matchType = matchType;
            this.matchPercentage = matchPercentage;
            this.matchQuality = matchQuality;
            this.routeCost = routeCost;
            this.ride = ride;
        }

        // Getters
        public Long getRideId() { return rideId; }
        public MatchType getMatchType() { return matchType; }
        public double getMatchPercentage() { return matchPercentage; }
        public int getMatchQuality() { return matchQuality; }
        public double getRouteCost() { return routeCost; }
        public Ride getRide() { return ride; }
    }

    public enum MatchType {
        DIRECT_MATCH("Same source and destination"),
        PARTIAL_MATCH("Passenger joins along driver's route"),
        FLEXIBLE_MATCH("Nearby but not exact route");

        private final String description;

        MatchType(String description) {
            this.description = description;
        }

        public String getDescription() {
            return description;
        }
    }
}
