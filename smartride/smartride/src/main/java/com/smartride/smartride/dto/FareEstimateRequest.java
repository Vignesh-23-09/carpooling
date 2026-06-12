package com.smartride.smartride.dto;

import lombok.Data;

@Data
public class FareEstimateRequest {

    private Long rideId;
    private int passengerCount;
}

