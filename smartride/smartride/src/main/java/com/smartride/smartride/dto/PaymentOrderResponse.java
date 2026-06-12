package com.smartride.smartride.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaymentOrderResponse {

    private String orderId;
    private int amount;
    private String currency;
    private String razorpayKey;
    private Long bookingId;
}

