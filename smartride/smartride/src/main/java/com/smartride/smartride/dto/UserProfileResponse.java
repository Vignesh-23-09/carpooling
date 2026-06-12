package com.smartride.smartride.dto;

import com.smartride.smartride.entity.Role;
import com.smartride.smartride.entity.VehicleType;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private Role role;

    // Driver fields
    private String carModel;
    private String licensePlate;
    private Integer vehicleCapacity;
    private VehicleType vehicleType;
    private double rating;
    private int ratingCount;

    // Passenger booking history
    private List<BookingResponse> bookingHistory;
}
