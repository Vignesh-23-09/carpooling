package com.smartride.smartride.repository;

import com.smartride.smartride.entity.Booking;
import com.smartride.smartride.entity.BookingStatus;
import com.smartride.smartride.entity.Ride;
import com.smartride.smartride.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByPassenger(User passenger);

    @Query("SELECT b FROM Booking b WHERE b.ride.driver = :driver")
    List<Booking> findByDriver(@Param("driver") User driver);

    List<Booking> findByRide(Ride ride);

    List<Booking> findByRideAndStatus(Ride ride, BookingStatus status);
}
