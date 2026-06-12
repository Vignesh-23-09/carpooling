package com.smartride.smartride.dto;

import lombok.Data;

@Data
public class CityFareEstimationRequest {
    private String sourceCity;
    private String destinationCity;
}