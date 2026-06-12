package com.smartride.smartride.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FareEstimationResponse {
    private double distanceKm;
    private double estimatedFare;
    private double minFare;      // 90% of estimated fare
    private double maxFare;      // 110% of estimated fare
    private String currency;
}