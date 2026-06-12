package com.smartride.smartride.service;

import com.smartride.smartride.dto.FareResponse;
import com.smartride.smartride.dto.FareEstimationResponse;
import com.smartride.smartride.entity.Ride;
import com.smartride.smartride.repository.RideRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FareService {

    private final RideRepository rideRepository;
    private final OsrmDistanceService osrmDistanceService;
    private final GeocodingService geocodingService;
    private final CoordinateValidationService coordinateValidationService;

    // Fare calculation constants
    private static final double SEAT_COST = 100.0;
    private static final double BASE_FARE = 50.0;
    private static final double PRICE_PER_KM = 5.0;

    public FareService(RideRepository rideRepository,
                       OsrmDistanceService osrmDistanceService,
                       GeocodingService geocodingService,
                       CoordinateValidationService coordinateValidationService) {
        this.rideRepository = rideRepository;
        this.osrmDistanceService = osrmDistanceService;
        this.geocodingService = geocodingService;
        this.coordinateValidationService = coordinateValidationService;
    }

    @Transactional(readOnly = true)
    public FareResponse calculateFare(Long rideId, int passengerCount) {
        if (passengerCount <= 0) {
            throw new RuntimeException("Passenger count must be greater than zero");
        }

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        // Log and validate coordinates
        coordinateValidationService.logCoordinateInfo(
                ride.getSource(), ride.getPickupLat(), ride.getPickupLon(),
                ride.getDestination(), ride.getDropLat(), ride.getDropLon()
        );

        double distanceKm = osrmDistanceService.getDistanceInKm(
                ride.getPickupLat(),
                ride.getPickupLon(),
                ride.getDropLat(),
                ride.getDropLon()
        );

        double farePerSeat = SEAT_COST + BASE_FARE + (distanceKm * PRICE_PER_KM);
        farePerSeat = Math.round(farePerSeat * 100.0) / 100.0; // round to 2 decimal places

        double totalFare = farePerSeat * passengerCount;
        double perPassengerFare = farePerSeat;

        return new FareResponse(distanceKm, totalFare, perPassengerFare);
    }

    public FareEstimationResponse estimateFare(double pickupLat, double pickupLon,
                                             double dropLat, double dropLon) {
        double distanceKm = osrmDistanceService.getDistanceInKm(pickupLat, pickupLon, dropLat, dropLon);
        double estimatedFare = SEAT_COST + BASE_FARE + (distanceKm * PRICE_PER_KM);
        estimatedFare = Math.round(estimatedFare * 100.0) / 100.0;

        double minFare = Math.round(estimatedFare * 0.9 * 100.0) / 100.0;
        double maxFare = Math.round(estimatedFare * 1.1 * 100.0) / 100.0;

        return new FareEstimationResponse(distanceKm, estimatedFare, minFare, maxFare, "INR");
    }

    public FareEstimationResponse estimateFareByCities(String sourceCity, String destinationCity) {
        System.out.println("\n╔════════════════════════════════════════════╗");
        System.out.println("║  FARE ESTIMATION REQUEST");
        System.out.println("║  From: " + sourceCity + " → To: " + destinationCity);
        System.out.println("╚════════════════════════════════════════════╝");

        double[] sourceCoords = geocodingService.getCoordinates(sourceCity);
        System.out.println("Source Coordinates: (" + sourceCoords[0] + ", " + sourceCoords[1] + ")");
        
        double[] destCoords = geocodingService.getCoordinates(destinationCity);
        System.out.println("Destination Coordinates: (" + destCoords[0] + ", " + destCoords[1] + ")");

        double distanceKm = osrmDistanceService.getDistanceInKm(
            sourceCoords[0], sourceCoords[1], destCoords[0], destCoords[1]
        );

        System.out.println("Final Distance: " + String.format("%.2f", distanceKm) + " km");

        double estimatedFare = SEAT_COST + BASE_FARE + (distanceKm * PRICE_PER_KM);
        estimatedFare = Math.round(estimatedFare * 100.0) / 100.0;

        double minFare = Math.round(estimatedFare * 0.9 * 100.0) / 100.0;
        double maxFare = Math.round(estimatedFare * 1.1 * 100.0) / 100.0;

        System.out.println("Estimated Fare: ₹" + estimatedFare);
        System.out.println("Fare Range: ₹" + minFare + " - ₹" + maxFare);
        System.out.println("╚════════════════════════════════════════════╝\n");

        return new FareEstimationResponse(distanceKm, estimatedFare, minFare, maxFare, "INR");
    }

    public double calculateFarePerSeatForRide(Ride ride) {
        double distanceKm = osrmDistanceService.getDistanceInKm(
            ride.getPickupLat(),
            ride.getPickupLon(),
            ride.getDropLat(),
            ride.getDropLon()
        );
        return calculateFarePerSeatForDistance(distanceKm);
    }

    /**
     * Compute per-seat fare from an externally provided distance (km).
     * This is useful when the distance has already been determined by a search
     * or estimation request so that we rely on the same OSRM result everywhere.
     */
    public double calculateFarePerSeatForDistance(double distanceKm) {
        return SEAT_COST + BASE_FARE + (distanceKm * PRICE_PER_KM);
    }

    public double getDistanceForRide(Ride ride) {
        return osrmDistanceService.getDistanceInKm(
            ride.getPickupLat(),
            ride.getPickupLon(),
            ride.getDropLat(),
            ride.getDropLon()
        );
    }
}

