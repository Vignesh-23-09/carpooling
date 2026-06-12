package com.smartride.smartride.dto;

import com.smartride.smartride.entity.VehicleType;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class RideRequest {
    private String source;
    private String destination;
    private LocalDate date;
    private LocalTime time;
    private int seats;
    private double price;
    private double baseFare;
    private double farePerKm;
    private double pickupLat;
    private double pickupLon;
    private double dropLat;
    private double dropLon;
    private VehicleType vehicleType; // optional override; defaults to driver's profile
}
