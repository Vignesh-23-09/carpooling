package com.smartride.smartride.entity;

public enum BookingStatus {
    PENDING_PAYMENT,    // Booking created, waiting for payment
    PAID,              // Payment successful, booking ready
    CONFIRMED,         // Driver assigned, ride ready to start
    PAYMENT_FAILED,    // Payment verification failed
    CANCELLED,         // Booking cancelled
    COMPLETED          // Ride completed
}
