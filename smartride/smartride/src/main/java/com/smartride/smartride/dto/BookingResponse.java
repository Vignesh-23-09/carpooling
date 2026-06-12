package com.smartride.smartride.dto;

import com.smartride.smartride.entity.BookingStatus;
import com.smartride.smartride.entity.RideStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
public class BookingResponse {

    private Long bookingId;
    private Long rideId;

    private String source;
    private String destination;
    private LocalDate date;
    private LocalTime time;

    private int seatCount;
    private double totalFare;
    private LocalDateTime bookingTime;

    private String driverName;
    private Long driverId;
    private String passengerName;

    private BookingStatus status;
    private RideStatus rideStatus;
}
