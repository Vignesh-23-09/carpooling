package com.smartride.smartride.controller;

import com.smartride.smartride.dto.*;
import com.smartride.smartride.service.RideService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/passenger")
public class PassengerController {

    private final RideService rideService;

    public PassengerController(RideService rideService) {
        this.rideService = rideService;
    }

    /** Passenger profile with booking history */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(rideService.getPassengerProfile(authentication.getName()));
    }

    /** Search rides by source, destination, date + optional filters */
    @PostMapping("/search")
    public ResponseEntity<List<RideResponse>> searchRides(@RequestBody RideSearchRequest request) {
        return ResponseEntity.ok(rideService.searchRides(request));
    }

    /** Book a ride */
    @PostMapping("/book")
    public ResponseEntity<String> bookRide(@RequestBody BookingRequest request,
                                           Authentication authentication) {
        return ResponseEntity.ok(rideService.bookRide(request, authentication.getName()));
    }

    /** Confirm booking after successful payment */
    @PostMapping("/confirm/{bookingId}")
    public ResponseEntity<String> confirmBooking(@PathVariable Long bookingId,
                                                 Authentication authentication) {
        return ResponseEntity.ok(rideService.confirmBookingAfterPayment(bookingId, authentication.getName()));
    }

    /** Cancel a booking */
    @PutMapping("/cancel/{bookingId}")
    public ResponseEntity<String> cancelBooking(@PathVariable Long bookingId,
                                                Authentication authentication) {
        return ResponseEntity.ok(rideService.cancelBooking(bookingId, authentication.getName()));
    }

    /** Delete a cancelled booking permanently */
    @DeleteMapping("/delete/{bookingId}")
    public ResponseEntity<String> deleteBooking(@PathVariable Long bookingId,
                                                 Authentication authentication) {
        return ResponseEntity.ok(rideService.deleteBooking(bookingId, authentication.getName()));
    }

    /** View all my bookings */
    @GetMapping("/my-bookings")
    public ResponseEntity<List<BookingResponse>> getMyBookings(Authentication authentication) {
        return ResponseEntity.ok(rideService.getPassengerBookings(authentication.getName()));
    }

    /** Rate a driver after a confirmed trip */
    @PostMapping("/rate-driver")
    public ResponseEntity<String> rateDriver(@RequestBody RateDriverRequest request,
                                             Authentication authentication) {
        return ResponseEntity.ok(rideService.rateDriver(request, authentication.getName()));
    }
}
