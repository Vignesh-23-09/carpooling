package com.smartride.smartride.service;

import com.smartride.smartride.entity.RideStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.smartride.smartride.dto.RideStatusMessage;
import java.time.LocalDateTime;

/**
 * Handles real-time ride status notifications via WebSocket
 */
@Service
public class RideNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public RideNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Notify driver of a new booking request
     */
    public void notifyDriverBooking(Long driverId, Long bookingId, String passengerName, 
                                   String pickupLocation, String dropoffLocation) {
        RideStatusMessage message = new RideStatusMessage();
        message.setBookingId(bookingId);
        message.setStatus("NEW_BOOKING");
        message.setMessage("New booking from " + passengerName);
        message.setPickupLocation(pickupLocation);
        message.setDropoffLocation(dropoffLocation);
        message.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
            "/topic/driver/" + driverId + "/bookings",
            message
        );

        System.out.println("✓ WebSocket notification sent to driver " + driverId + 
                         " for booking " + bookingId);
    }

    /**
     * Notify passenger of driver assignment
     */
    public void notifyPassengerDriverAssigned(Long passengerId, Long bookingId, String driverName,
                                             String carModel, String licensePlate, String driverPhone) {
        RideStatusMessage message = new RideStatusMessage();
        message.setBookingId(bookingId);
        message.setStatus("DRIVER_ASSIGNED");
        message.setMessage("Driver " + driverName + " has been assigned");
        message.setDriverName(driverName);
        message.setCarModel(carModel);
        message.setLicensePlate(licensePlate);
        message.setDriverPhone(driverPhone);
        message.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
            "/topic/passenger/" + passengerId + "/rides",
            message
        );

        System.out.println("✓ WebSocket notification sent to passenger " + passengerId + 
                         " - Driver assigned");
    }

    /**
     * Notify passenger of driver arrival
     */
    public void notifyPassengerDriverArriving(Long passengerId, Long bookingId, String driverName,
                                             double latitude, double longitude, int etaSeconds) {
        RideStatusMessage message = new RideStatusMessage();
        message.setBookingId(bookingId);
        message.setStatus("DRIVER_ARRIVING");
        message.setMessage(driverName + " is arriving in " + (etaSeconds / 60) + " minutes");
        message.setDriverName(driverName);
        message.setLatitude(latitude);
        message.setLongitude(longitude);
        message.setEtaSeconds(etaSeconds);
        message.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
            "/topic/passenger/" + passengerId + "/rides",
            message
        );

        System.out.println("✓ WebSocket notification sent to passenger " + passengerId + 
                         " - Driver arriving (ETA: " + (etaSeconds / 60) + " min)");
    }

    /**
     * Notify passenger of ride started
     */
    public void notifyPassengerRideStarted(Long passengerId, Long bookingId) {
        RideStatusMessage message = new RideStatusMessage();
        message.setBookingId(bookingId);
        message.setStatus("RIDE_STARTED");
        message.setMessage("Your ride has started");
        message.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
            "/topic/passenger/" + passengerId + "/rides",
            message
        );

        System.out.println("✓ WebSocket notification sent to passenger " + passengerId + 
                         " - Ride started");
    }

    /**
     * Notify passenger of ride completed
     */
    public void notifyPassengerRideCompleted(Long passengerId, Long bookingId, double totalFare,
                                            double distanceKm, int durationMinutes) {
        RideStatusMessage message = new RideStatusMessage();
        message.setBookingId(bookingId);
        message.setStatus("RIDE_COMPLETED");
        message.setMessage("Ride completed successfully");
        message.setTotalFare(totalFare);
        message.setDistanceKm(distanceKm);
        message.setDurationMinutes(durationMinutes);
        message.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
            "/topic/passenger/" + passengerId + "/rides",
            message
        );

        System.out.println("✓ WebSocket notification sent to passenger " + passengerId + 
                         " - Ride completed");
    }

    /**
     * Notify driver of ride acceptance
     */
    public void notifyDriverRideAccepted(Long driverId, Long bookingId, String passengerName) {
        RideStatusMessage message = new RideStatusMessage();
        message.setBookingId(bookingId);
        message.setStatus("RIDE_ACCEPTED");
        message.setMessage("You accepted booking from " + passengerName);
        message.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
            "/topic/driver/" + driverId + "/bookings",
            message
        );

        System.out.println("✓ WebSocket notification sent to driver " + driverId + 
                         " - Ride accepted");
    }

    /**
     * Notify driver or passenger of cancellation
     */
    public void notifyCancellation(Long userId, boolean isDriver, Long bookingId, String reason) {
        RideStatusMessage message = new RideStatusMessage();
        message.setBookingId(bookingId);
        message.setStatus("RIDE_CANCELLED");
        message.setMessage("Ride cancelled: " + reason);
        message.setTimestamp(LocalDateTime.now());

        String topic = isDriver 
            ? "/topic/driver/" + userId + "/bookings"
            : "/topic/passenger/" + userId + "/rides";

        messagingTemplate.convertAndSend(topic, message);

        System.out.println("✓ WebSocket notification sent to " + (isDriver ? "driver" : "passenger") + 
                         " " + userId + " - Ride cancelled");
    }

    /**
     * Broadcast ride status update to all participants
     */
    public void broadcastRideUpdate(Long rideId, RideStatus status) {
        RideStatusMessage message = new RideStatusMessage();
        message.setStatus(status.name());
        message.setMessage("Ride status updated to: " + status);
        message.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
            "/topic/rides/" + rideId + "/status",
            message
        );

        System.out.println("✓ Broadcast ride status update - Ride: " + rideId + 
                         ", Status: " + status);
    }

    /**
     * Send live driver location to passenger
     */
    public void sendDriverLocation(Long passengerId, Long bookingId, double latitude, 
                                   double longitude) {
        RideStatusMessage message = new RideStatusMessage();
        message.setBookingId(bookingId);
        message.setLatitude(latitude);
        message.setLongitude(longitude);
        message.setStatus("DRIVER_LOCATION_UPDATE");
        message.setTimestamp(LocalDateTime.now());

        messagingTemplate.convertAndSend(
            "/topic/passenger/" + passengerId + "/location",
            message
        );
    }
}
