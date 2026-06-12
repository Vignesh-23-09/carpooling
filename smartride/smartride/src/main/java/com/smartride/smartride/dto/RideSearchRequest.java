package com.smartride.smartride.dto;

import com.smartride.smartride.entity.VehicleType;
import lombok.Data;
import java.time.LocalDate;

@Data
public class RideSearchRequest {
    private String source;
    private String destination;
    private LocalDate date;

    // Price filter
    private Double minPrice;
    private Double maxPrice;

    // Vehicle type filter
    private VehicleType vehicleType;

    // Driver rating filter (e.g. minRating = 4.0 shows only drivers rated 4+)
    private Double minRating;
}
