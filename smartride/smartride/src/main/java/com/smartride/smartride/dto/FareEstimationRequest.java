package com.smartride.smartride.dto;

import lombok.Data;

@Data
public class FareEstimationRequest {
    private double pickupLat;
    private double pickupLon;
    private double dropLat;
    private double dropLon;
}