package com.smartride.smartride.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true)
    private String phone;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // Driver-specific fields
    private String carModel;
    private String licensePlate;
    private Integer vehicleCapacity;

    @Enumerated(EnumType.STRING)
    private VehicleType vehicleType;

    // Driver rating (calculated from reviews)
    private double rating = 0.0;
    private int ratingCount = 0;

    // Driver wallet balance (for payouts)
    @Column(name = "driver_wallet_balance")
    private double driverWalletBalance = 0.0;

    // Email verification
    private String otp;
    private boolean verified = false;
}
