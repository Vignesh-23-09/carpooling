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
public class ReceiptDTO {
    private Long bookingId;
    private Long rideId;
    private String passengerName;
    private String driverName;
    private String source;
    private String destination;
    private LocalDateTime bookingTime;
    private Double distanceKm;
    private Double farePerSeat;
    private Integer seatCount;
    private Double totalFare;
    private String paymentStatus;
    private String razorpayPaymentId;
    private LocalDateTime paymentTime;
    private String carModel;
    private String licensePlate;
    private String vehicleType;
}
