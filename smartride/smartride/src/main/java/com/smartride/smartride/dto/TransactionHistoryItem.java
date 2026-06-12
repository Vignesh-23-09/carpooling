package com.smartride.smartride.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TransactionHistoryItem {

    private Long rideBookingId;
    private double amount;
    private String status;
    private String paymentId;
    private LocalDate date;
}

