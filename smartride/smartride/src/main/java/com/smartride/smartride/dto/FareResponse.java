package com.smartride.smartride.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FareResponse {

    private double distanceKm;
    private double totalFare;
    private double perPassengerFare;
}

