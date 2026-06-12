package com.smartride.smartride.dto;

import lombok.Data;

@Data
public class RateDriverRequest {
    private Long bookingId;   // must have a completed booking to rate
    private int rating;       // 1 to 5
}
