package com.smartride.smartride.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Entity
@Table(name = "rides")
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Column(nullable = false)
    private String source;

    @Column(nullable = false)
    private String destination;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private LocalTime time;

    @Column(nullable = false)
    private int availableSeats;

    @Column(nullable = false)
    private double price;

    // Base fare mapped to existing DB column base_fare
    @Column(name = "base_fare", nullable = false)
    private double baseFare = 0.0;

    // Per-kilometer fare mapped to existing DB column fare_per_km
    @Column(name = "fare_per_km", nullable = false)
    private double farePerKm = 0.0;

    // Precise pickup and drop coordinates for OSRM distance calculation
    @Column(name = "pickup_lat", nullable = false)
    private double pickupLat;

    @Column(name = "pickup_lon", nullable = false)
    private double pickupLon;

    @Column(name = "drop_lat", nullable = false)
    private double dropLat;

    @Column(name = "drop_lon", nullable = false)
    private double dropLon;

    // Auto-filled from driver profile
    private String carModel;
    private String licensePlate;

    @Enumerated(EnumType.STRING)
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private RideStatus status = RideStatus.PENDING;
}
