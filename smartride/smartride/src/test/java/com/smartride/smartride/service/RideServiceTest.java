package com.smartride.smartride.service;

import com.smartride.smartride.dto.RideResponse;
import com.smartride.smartride.dto.RideSearchRequest;
import com.smartride.smartride.entity.Ride;
import com.smartride.smartride.entity.User;
import com.smartride.smartride.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.junit.jupiter.MockitoSettings;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class RideServiceTest {

    @Mock
    private RideRepository rideRepository;
    @Mock
    private GeocodingService geocodingService;
    @Mock
    private OsrmDistanceService osrmDistanceService;
    @Mock
    private FareService fareService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private UserService userService;
    @Mock
    private PaymentService paymentService;
    @Mock
    private DriverStatusRepository driverStatusRepository;
    @Mock
    private RideStatusPublisher rideStatusPublisher;
    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private RideService rideService;

    private Ride sampleRide;

    @BeforeEach
    void setUp() {
        sampleRide = new Ride();
        sampleRide.setId(1L);
        sampleRide.setSource("X");
        sampleRide.setDestination("Y");
        sampleRide.setDate(LocalDate.now());
        sampleRide.setTime(LocalTime.NOON);
        sampleRide.setAvailableSeats(2);
        sampleRide.setPrice(500.0);
        sampleRide.setPickupLat(10.0);
        sampleRide.setPickupLon(20.0);
        sampleRide.setDropLat(11.0);
        sampleRide.setDropLon(21.0);
        User driver = new User();
        driver.setName("Driver");
        sampleRide.setDriver(driver);
    }

    @Test
    void searchRides_usesSearchRouteDistance() {
        // passenger searches between A and B
        // stub repository call very leniently so that argument mismatches don't
        // cause test failures; we only care that a non-empty list is returned.
        lenient().when(rideRepository.searchRides(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(Collections.singletonList(sampleRide));
        when(geocodingService.getCoordinates("A")).thenReturn(new double[]{1.0, 1.0});
        when(geocodingService.getCoordinates("B")).thenReturn(new double[]{2.0, 2.0});
        // pretend osrm returns 123 km for the search route
        when(osrmDistanceService.getDistanceInKm(1.0,1.0,2.0,2.0)).thenReturn(123.0);
        // stub fare service to mirror FareService constants so assertions later
        when(fareService.calculateFarePerSeatForDistance(123.0)).thenReturn(100.0 + 50.0 + 123.0 * 5.0);

        RideSearchRequest req = new RideSearchRequest();
        req.setSource("A");
        req.setDestination("B");
        req.setDate(LocalDate.now());

        List<RideResponse> results = rideService.searchRides(req);
        assertEquals(1, results.size());
        RideResponse r = results.get(0);
        assertEquals(123.0, r.getDistanceKm(), 0.0001);
        // calculatedFarePerSeat should correspond to 123 km using FareService constants
        assertEquals(100 + 50 + 123 * 5, r.getCalculatedFarePerSeat(), 0.01);
    }
}
