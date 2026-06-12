package com.smartride.smartride.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideMatchResponseDTO {
    private Long rideId;
    private String matchType;           // DIRECT_MATCH, PARTIAL_MATCH, FLEXIBLE_MATCH
    private Double matchPercentage;      // 0.0-1.0
    private Integer matchQuality;        // 1-10 quality score
    private Double estimatedFare;
    private Double distanceKm;
    private String driverName;
    private String carModel;
    private String licensePlate;
    private String vehicleType;
    private Integer availableSeats;
    private Double driverRating;
    private String source;
    private String destination;
}
