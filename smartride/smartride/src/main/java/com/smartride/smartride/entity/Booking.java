package com.smartride.smartride.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id", nullable = false)
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    @Column(nullable = false)
    private Integer seatCount;

    @Column(nullable = false)
    private Double fare;

    // Maps existing DB column total_fare to keep old schema compatible
    @Column(name = "total_fare", nullable = false)
    private Double totalFare;

    // Store the distance from fare estimation to ensure consistency
    @Column(name = "estimated_distance_km")
    private Double estimatedDistanceKm;

    // Store the estimated fare for reference (before multiplying by seat count)
    @Column(name = "estimated_fare_per_seat")
    private Double estimatedFarePerSeat;

    @Column(nullable = false)
    private LocalDateTime bookingTime;

    @Column(name = "payment_status")
    private String paymentStatus;

    @Column(name = "razorpay_order_id")
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BookingStatus status = BookingStatus.CONFIRMED;

    /**
     * Prevents a passenger from rating the same booking more than once.
     * Set to true after rateDriver() is called.
     */
    @Column(nullable = false)
    private boolean rated = false;
}
