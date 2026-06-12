package com.smartride.smartride.dto;

import com.smartride.smartride.entity.VehicleType;
import com.smartride.smartride.entity.RideStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
public class RideResponse {
    private Long id;
    private String source;
    private String destination;
    private LocalDate date;
    private LocalTime time;
    private int availableSeats;
    private double price;
    private double calculatedFarePerSeat;
    private double distanceKm;
    private String driverName;
    private double driverRating;
    private VehicleType vehicleType;
    private String carModel;
    private String licensePlate;
    private RideStatus status;
}
