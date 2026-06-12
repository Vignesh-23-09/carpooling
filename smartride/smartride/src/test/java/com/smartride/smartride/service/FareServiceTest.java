package com.smartride.smartride.service;

import com.smartride.smartride.dto.FareResponse;
import com.smartride.smartride.entity.Ride;
import com.smartride.smartride.repository.RideRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FareServiceTest {

    @Mock
    private RideRepository rideRepository;

    @Mock
    private OsrmDistanceService osrmDistanceService;

    @Mock
    private CoordinateValidationService coordinateValidationService;

    @InjectMocks
    private FareService fareService;

    private Ride sampleRide;

    @BeforeEach
    void setUp() {
        sampleRide = new Ride();
        sampleRide.setId(1L);
        sampleRide.setBaseFare(50.0);
        sampleRide.setFarePerKm(10.0);
        sampleRide.setPickupLat(12.0);
        sampleRide.setPickupLon(77.0);
        sampleRide.setDropLat(12.5);
        sampleRide.setDropLon(77.5);
    }

    @Test
    void calculateFare_zeroDistance_usesBaseFareOnly() {
        when(rideRepository.findById(1L)).thenReturn(Optional.of(sampleRide));
        when(osrmDistanceService.getDistanceInKm(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(0.0);

        FareResponse response = fareService.calculateFare(1L, 2);

        assertEquals(0.0, response.getDistanceKm(), 0.0001);
        assertEquals(300.0, response.getTotalFare(), 0.0001); // 150 * 2
        assertEquals(150.0, response.getPerPassengerFare(), 0.0001); // 100 + 50 + 0
    }

    @Test
    void calculateFare_singlePassenger_perPassengerEqualsTotal() {
        when(rideRepository.findById(1L)).thenReturn(Optional.of(sampleRide));
        when(osrmDistanceService.getDistanceInKm(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(5.0); // 5 km

        FareResponse response = fareService.calculateFare(1L, 1);

        double expectedFare = 100.0 + 50.0 + 5.0 * 5.0; // 175
        assertEquals(expectedFare, response.getTotalFare(), 0.0001);
        assertEquals(expectedFare, response.getPerPassengerFare(), 0.0001);
    }

    @Test
    void calculateFare_multiplePassengers_splitsFare() {
        when(rideRepository.findById(1L)).thenReturn(Optional.of(sampleRide));
        when(osrmDistanceService.getDistanceInKm(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(10.0); // 10 km

        FareResponse response = fareService.calculateFare(1L, 4);

        double expectedFarePerSeat = 100.0 + 50.0 + 10.0 * 5.0; // 200
        double expectedTotal = expectedFarePerSeat * 4; // 800
        assertEquals(expectedTotal, response.getTotalFare(), 0.0001);
        assertEquals(expectedFarePerSeat, response.getPerPassengerFare(), 0.0001);
    }

    @Test
    void calculateFare_invalidRideId_throws() {
        when(rideRepository.findById(99L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> fareService.calculateFare(99L, 1));
        assertEquals("Ride not found", ex.getMessage());
    }

    @Test
    void calculateFare_invalidPassengerCount_throws() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> fareService.calculateFare(1L, 0));
        assertEquals("Passenger count must be greater than zero", ex.getMessage());

        verifyNoInteractions(rideRepository, osrmDistanceService);
    }
}

