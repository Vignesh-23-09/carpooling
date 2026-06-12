package com.smartride.smartride.dto;

import lombok.Data;

/**
 * Request payload when a passenger books a ride.  In order to guarantee that
 * the fare/distance used for payment matches the value shown in the UI we
 * accept the search route (source/destination) as part of the request.  The
 * backend then uses OSRM again against the same cities so no client trust is
 * required.
 */
@Data
public class BookingRequest {
    private Long rideId;
    private int seatCount;

    // optional: source and destination from the passenger's search form
    private String sourceCity;
    private String destinationCity;
}
