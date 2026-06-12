package com.smartride.smartride.controller;

import com.smartride.smartride.dto.*;
import com.smartride.smartride.service.RideService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/driver")
public class DriverController {

    private final RideService rideService;

    public DriverController(RideService rideService) {
        this.rideService = rideService;
    }

    /** Driver profile - name, contact, vehicle details, rating */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(rideService.getDriverProfile(authentication.getName()));
    }

    /** Post a new ride - vehicle details auto-filled from profile */
    @PostMapping("/post-ride")
    public ResponseEntity<RideResponse> postRide(@RequestBody RideRequest request,
                                                  Authentication authentication) {
        return ResponseEntity.ok(rideService.postRide(authentication.getName(), request));
    }

    /** All rides posted by this driver */
    @GetMapping("/my-rides")
    public ResponseEntity<List<RideResponse>> getMyRides(Authentication authentication) {
        return ResponseEntity.ok(rideService.getDriverRides(authentication.getName()));
    }

    /** All bookings made on this driver's rides */
    @GetMapping("/bookings")
    public ResponseEntity<List<BookingResponse>> getDriverBookings(Authentication authentication) {
        return ResponseEntity.ok(rideService.getDriverBookings(authentication.getName()));
    }

    /** Driver wallet balance */
    @GetMapping("/wallet/balance")
    public ResponseEntity<Double> getWalletBalance(Authentication authentication) {
        return ResponseEntity.ok(rideService.getDriverWalletBalance(authentication.getName()));
    }

    /** Accept a ride booking */
    @PostMapping("/accept-ride/{rideId}")
    public ResponseEntity<String> acceptRide(@PathVariable Long rideId,
                                             Authentication authentication) {
        return ResponseEntity.ok(rideService.acceptRide(rideId, authentication.getName()));
    }

    /** Start a ride */
    @PostMapping("/start-ride/{rideId}")
    public ResponseEntity<String> startRide(@PathVariable Long rideId,
                                            Authentication authentication) {
        return ResponseEntity.ok(rideService.startRide(rideId, authentication.getName()));
    }

    /** Complete a ride and credit driver earnings */
    @PostMapping("/complete-ride/{rideId}")
    public ResponseEntity<String> completeRide(@PathVariable Long rideId,
                                               Authentication authentication) {
        return ResponseEntity.ok(rideService.completeRide(rideId, authentication.getName()));
    }

    /** Cancel a ride with reason */
    @PostMapping("/cancel-ride/{rideId}")
    public ResponseEntity<String> cancelRide(@PathVariable Long rideId,
                                             @RequestParam String reason,
                                             Authentication authentication) {
        return ResponseEntity.ok(rideService.cancelRide(rideId, reason, authentication.getName()));
    }

    /** Delete a completed ride */
    @DeleteMapping("/delete-ride/{rideId}")
    public ResponseEntity<String> deleteRide(@PathVariable Long rideId,
                                             Authentication authentication) {
        return ResponseEntity.ok(rideService.deleteRide(rideId, authentication.getName()));
    }

    @GetMapping("/dashboard")
    public String dashboard() {
        return "Welcome to Driver Dashboard";
    }
}
