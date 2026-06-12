package com.smartride.smartride.service;

import com.smartride.smartride.dto.RideStatusMessage;
import com.smartride.smartride.entity.RideStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class RideStatusPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public RideStatusPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Publish ride status update to WebSocket subscribers
     * 
     * @param rideId The ID of the ride
     * @param status The current status of the ride
     */
    public void publishRideStatus(Long rideId, RideStatus status) {
        String statusMessage = getStatusMessage(status);

        RideStatusMessage message = RideStatusMessage.builder()
                .rideId(rideId)
                .status(status.name())
                .message(statusMessage)
                .build();

        // Broadcast to all clients subscribed to this ride's topic
        messagingTemplate.convertAndSend(
                "/topic/ride-status/" + rideId,
                message
        );

        System.out.println("Published ride status: Ride #" + rideId + " -> " + status);
    }

    /**
     * Get user-friendly message for the ride status
     */
    private String getStatusMessage(RideStatus status) {
        switch (status) {
            case PENDING:
                return "Searching for driver...";
            case DRIVER_ASSIGNED:
                return "Driver assigned! Heading to pickup location.";
            case RIDE_STARTED:
                return "Ride started. You're on your way!";
            case RIDE_COMPLETED:
                return "Ride completed. Thank you for using SmartRide!";
            default:
                return "Unknown status";
        }
    }
}
