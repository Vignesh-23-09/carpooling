package com.smartride.smartride.repository;

import com.smartride.smartride.entity.Booking;
import com.smartride.smartride.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByBooking(Booking booking);
}

