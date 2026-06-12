package com.smartride.smartride.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideStatusMessage {
    private Long rideId;
    private Long bookingId;
    private String status;
    private String message;
    private LocalDateTime timestamp;
    
    // Driver information
    private String driverName;
    private String driverPhone;
    private String carModel;
    private String licensePlate;
    
    // Location information
    private double latitude;
    private double longitude;
    private String pickupLocation;
    private String dropoffLocation;
    
    // Ride details
    private double totalFare;
    private double distanceKm;
    private int durationMinutes;
    private int etaSeconds;
    
    // Passenger info
    private String passengerName;
}
