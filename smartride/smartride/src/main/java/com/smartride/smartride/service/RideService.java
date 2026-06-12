package com.smartride.smartride.service;

import com.smartride.smartride.dto.*;
import com.smartride.smartride.entity.*;
import com.smartride.smartride.repository.*;
import com.smartride.smartride.service.GeocodingService;
import com.smartride.smartride.service.OsrmDistanceService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RideService {

    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final PaymentService paymentService;
    private final FareService fareService;
    private final GeocodingService geocodingService;
    private final OsrmDistanceService osrmDistanceService;
    private final DriverStatusRepository driverStatusRepository;
    private final RideStatusPublisher rideStatusPublisher;
    private final TransactionRepository transactionRepository;
    private final PaymentRepository paymentRepository;

    public RideService(RideRepository rideRepository,
                       BookingRepository bookingRepository,
                       UserRepository userRepository,
                       UserService userService,
                       PaymentService paymentService,
                       FareService fareService,
                       GeocodingService geocodingService,
                       OsrmDistanceService osrmDistanceService,
                       DriverStatusRepository driverStatusRepository,
                       RideStatusPublisher rideStatusPublisher,
                       TransactionRepository transactionRepository,
                       PaymentRepository paymentRepository) {
        this.rideRepository = rideRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.paymentService = paymentService;
        this.fareService = fareService;
        this.geocodingService = geocodingService;
        this.osrmDistanceService = osrmDistanceService;
        this.driverStatusRepository = driverStatusRepository;
        this.rideStatusPublisher = rideStatusPublisher;
        this.transactionRepository = transactionRepository;
        this.paymentRepository = paymentRepository;
    }

    // ─── Driver: Post a ride ────────────────────────────────────────────────
    @Transactional
    public RideResponse postRide(String driverEmail, RideRequest request) {
        User driver = getUser(driverEmail);

        Ride ride = new Ride();
        ride.setDriver(driver);
        ride.setSource(request.getSource());
        ride.setDestination(request.getDestination());
        ride.setDate(request.getDate());
        ride.setTime(request.getTime());
        ride.setAvailableSeats(request.getSeats());
        ride.setPrice(request.getPrice());
        ride.setBaseFare(request.getBaseFare());
        ride.setFarePerKm(request.getFarePerKm());
        ride.setPickupLat(request.getPickupLat());
        ride.setPickupLon(request.getPickupLon());
        ride.setDropLat(request.getDropLat());
        ride.setDropLon(request.getDropLon());
        ride.setCarModel(driver.getCarModel());
        ride.setLicensePlate(driver.getLicensePlate());
        ride.setVehicleType(request.getVehicleType() != null
                ? request.getVehicleType()
                : driver.getVehicleType());

        ride = rideRepository.save(ride);
        return toRideResponse(ride);
    }

    // ─── Driver: Get my rides ─────────────────────────────────────────────
    // @Transactional(readOnly=true) keeps the session open so lazy fields load correctly
    @Transactional(readOnly = true)
    public List<RideResponse> getDriverRides(String driverEmail) {
        User driver = getUser(driverEmail);
        return rideRepository.findByDriver(driver).stream()
                .map(this::toRideResponse)
                .collect(Collectors.toList());
    }

    // ─── Driver: See all bookings on my rides ─────────────────────────────
    @Transactional(readOnly = true)
    public List<BookingResponse> getDriverBookings(String driverEmail) {
        User driver = getUser(driverEmail);
        return bookingRepository.findByDriver(driver).stream()
                .map(this::toBookingResponse)
                .collect(Collectors.toList());
    }

    // ─── Passenger: Search rides ───────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<RideResponse> searchRides(RideSearchRequest request) {
        // Convert enum to String to avoid Hibernate null-binding issue with enum params
        String vehicleTypeStr = (request.getVehicleType() != null)
                ? request.getVehicleType().name()
                : null;

        // Determine coordinates for the passenger's search route once.
        double[] searchSrcCoords = geocodingService.getCoordinates(request.getSource());
        double[] searchDestCoords = geocodingService.getCoordinates(request.getDestination());
        double searchPickupLat = searchSrcCoords[0];
        double searchPickupLon = searchSrcCoords[1];
        double searchDropLat = searchDestCoords[0];
        double searchDropLon = searchDestCoords[1];

        return rideRepository.searchRides(
                request.getSource(),
                request.getDestination(),
                request.getDate(),
                request.getMinPrice(),
                request.getMaxPrice(),
                vehicleTypeStr,
                request.getMinRating()
        ).stream()
          .map(ride -> {
              // compute distance using search route, not ride's own coords
              double distanceKm = osrmDistanceService.getDistanceInKm(
                      searchPickupLat, searchPickupLon,
                      searchDropLat, searchDropLon);
              System.out.println("[SEARCH] distance for " + request.getSource() + " -> " + request.getDestination() + ": " + distanceKm + " km");
              return toRideResponse(ride, distanceKm);
          })
          .collect(Collectors.toList());
    }

    // ─── Passenger: Book a ride (Create temporary booking, assign seats, create payment order) ────────────
    @Transactional
    public String bookRide(BookingRequest request, String passengerEmail) {
        System.out.println("=== BOOKING CREATION START ===");
        System.out.println("Ride ID: " + request.getRideId());
        System.out.println("Passenger: " + passengerEmail);
        System.out.println("Seat Count: " + request.getSeatCount());

        User passenger = getUser(passengerEmail);

        Ride ride = rideRepository.findById(request.getRideId())
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (ride.getAvailableSeats() < request.getSeatCount()) {
            throw new RuntimeException("Not enough seats available. Only "
                    + ride.getAvailableSeats() + " seat(s) left.");
        }

        // CRITICAL: Reserve seats FIRST but don't confirm booking yet
        ride.setAvailableSeats(ride.getAvailableSeats() - request.getSeatCount());
        rideRepository.save(ride);
        System.out.println("Seats reserved. Remaining: " + ride.getAvailableSeats());

        // compute distance using the passenger's search route if provided
        double distanceKm;
        if (request.getSourceCity() != null && request.getDestinationCity() != null) {
            double[] src = geocodingService.getCoordinates(request.getSourceCity());
            double[] dst = geocodingService.getCoordinates(request.getDestinationCity());
            distanceKm = osrmDistanceService.getDistanceInKm(
                    src[0], src[1], dst[0], dst[1]);
            System.out.println("Distance calculated from search route: " + distanceKm + " km");
        } else {
            // fallback – should rarely happen, but preserve existing behaviour
            distanceKm = fareService.getDistanceForRide(ride);
            System.out.println("Distance calculated from ride coords: " + distanceKm + " km");
        }

        // Create booking with PENDING_PAYMENT status
        Booking booking = new Booking();
        booking.setRide(ride);
        booking.setPassenger(passenger);
        booking.setSeatCount(request.getSeatCount());
        
        // Calculate fare using the same distance that will be shown on the UI
        double farePerSeat = fareService.calculateFarePerSeatForDistance(distanceKm);
        double totalFare = Math.round(farePerSeat * request.getSeatCount() * 100.0) / 100.0;
        
        // Store distance and estimated fare for consistency with Razorpay payment
        booking.setEstimatedDistanceKm(distanceKm);
        booking.setEstimatedFarePerSeat(farePerSeat);
        booking.setFare(farePerSeat);
        booking.setTotalFare(totalFare);
        booking.setBookingTime(LocalDateTime.now());
        // STATUS IS PENDING_PAYMENT - NOT CONFIRMED YET
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setRated(false);
        booking = bookingRepository.save(booking);
        System.out.println("Temporary booking created with ID: " + booking.getId());
        System.out.println("Booking Status: PENDING_PAYMENT");
        System.out.println("Distance stored in booking: " + distanceKm + " km");
        System.out.println("Fare: " + farePerSeat + " per seat, Total: " + totalFare);

        // Create Razorpay payment order for frontend
        paymentService.createOrderForBooking(booking.getId());
        System.out.println("=== BOOKING CREATION END ===");

        // Return booking ID so frontend can open Razorpay
        return "Booking #" + booking.getId() + " created! Please complete payment to confirm.";
    }

    // ─── Passenger: Confirm booking after payment success ────────────────────
    @Transactional
    public String confirmBookingAfterPayment(Long bookingId, String passengerEmail) {
        System.out.println("=== BOOKING CONFIRMATION START ===");
        System.out.println("Booking ID: " + bookingId);
        System.out.println("Passenger: " + passengerEmail);

        User passenger = getUser(passengerEmail);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // Verify passenger owns the booking
        if (!booking.getPassenger().getId().equals(passenger.getId())) {
            throw new RuntimeException("Unauthorized: You do not own this booking");
        }

        // Only confirm if payment was successful
        if (booking.getStatus() != BookingStatus.PAID) {
            throw new RuntimeException("Booking payment not verified. Status: " + booking.getStatus());
        }

        Ride ride = booking.getRide();

        // ─── Route Matching: Find available drivers in pickup city ────────────
        List<DriverStatus> availableDrivers = driverStatusRepository
                .findByCurrentCityAndIsAvailableTrue(ride.getSource());

        if (!availableDrivers.isEmpty()) {
            // Assign the first available driver
            DriverStatus driverStatus = availableDrivers.get(0);
            User assignedDriver = userRepository.findById(driverStatus.getDriverId())
                    .orElseThrow(() -> new RuntimeException("Assigned driver not found"));

            // Update ride with assigned driver
            ride.setDriver(assignedDriver);
            ride.setStatus(RideStatus.DRIVER_ASSIGNED);
            rideRepository.save(ride);
            System.out.println("Driver assigned: " + assignedDriver.getName());

            // Publish ride status update via WebSocket
            rideStatusPublisher.publishRideStatus(ride.getId(), RideStatus.DRIVER_ASSIGNED);

            // Mark driver as unavailable
            driverStatus.setIsAvailable(false);
            driverStatus.setLastUpdated(LocalDateTime.now());
            driverStatusRepository.save(driverStatus);

            // Create transaction record now that driver is assigned
            Transaction tx = new Transaction();
            
            // Try to get payment ID if payment record exists for this booking
            paymentRepository.findByBooking(booking).ifPresent(payment -> 
                tx.setPaymentId(payment.getId())
            );
            
            tx.setUser(booking.getPassenger());
            tx.setBooking(booking);
            tx.setDriver(assignedDriver);
            tx.setAmount(booking.getTotalFare());
            tx.setRazorpayPaymentId(booking.getRazorpayPaymentId());
            tx.setRazorpayOrderId(booking.getRazorpayOrderId());
            tx.setStatus("SUCCESS");
            transactionRepository.save(tx);
            System.out.println("Transaction created for booking: " + booking.getId());
        } else {
            // No driver available, keep ride status as PENDING
            ride.setStatus(RideStatus.PENDING);
            rideRepository.save(ride);
            System.out.println("No drivers available - ride status: PENDING");

            // Publish ride status update via WebSocket
            rideStatusPublisher.publishRideStatus(ride.getId(), RideStatus.PENDING);
        }

        // Set booking to CONFIRMED
        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(booking);
        System.out.println("Booking confirmed!");
        System.out.println("=== BOOKING CONFIRMATION END ===");

        // Include booking id and ride status in the message
        return "Booking #" + bookingId + " confirmed! " + booking.getSeatCount()
                + " seat(s) booked for ride from "
                + ride.getSource() + " to " + ride.getDestination() + " on " + ride.getDate()
                + ". Status: " + ride.getStatus() + ".";
    }

    // ─── Passenger: Cancel a booking ──────────────────────────────────────
    @Transactional
    public String cancelBooking(Long bookingId, String passengerEmail) {
        User passenger = getUser(passengerEmail);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getPassenger().getId().equals(passenger.getId())) {
            throw new RuntimeException("You are not authorized to cancel this booking");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new RuntimeException("Booking is already cancelled");
        }

        Ride ride = booking.getRide();
        ride.setAvailableSeats(ride.getAvailableSeats() + booking.getSeatCount());
        rideRepository.save(ride);

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        return "Booking #" + bookingId + " cancelled successfully.";
    }

    // ─── Passenger: Delete a cancelled booking ────────────────────────────────
    @Transactional
    public String deleteBooking(Long bookingId, String passengerEmail) {
        User passenger = getUser(passengerEmail);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getPassenger().getId().equals(passenger.getId())) {
            throw new RuntimeException("You are not authorized to delete this booking");
        }

        if (booking.getStatus() != BookingStatus.CANCELLED) {
            throw new RuntimeException("Only cancelled bookings can be deleted");
        }

        bookingRepository.delete(booking);
        return "Booking #" + bookingId + " deleted successfully.";
    }

    // ─── Passenger: My bookings ────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<BookingResponse> getPassengerBookings(String passengerEmail) {
        User passenger = getUser(passengerEmail);
        return bookingRepository.findByPassenger(passenger).stream()
                .map(this::toBookingResponse)
                .collect(Collectors.toList());
    }

    // ─── Passenger: Rate a driver ──────────────────────────────────────────
    @Transactional
    public String rateDriver(RateDriverRequest request, String passengerEmail) {
        if (request.getRating() < 1 || request.getRating() > 5) {
            throw new RuntimeException("Rating must be between 1 and 5");
        }

        User passenger = getUser(passengerEmail);

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getPassenger().getId().equals(passenger.getId())) {
            throw new RuntimeException("You can only rate your own bookings");
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("You can only rate a confirmed booking");
        }

        if (booking.isRated()) {
            throw new RuntimeException("You have already rated this booking");
        }

        User driver = booking.getRide().getDriver();
        userService.updateDriverRating(driver, request.getRating());

        booking.setRated(true);
        bookingRepository.save(booking);

        return "Thank you! You rated driver " + driver.getName()
                + " " + request.getRating() + " star(s).";
    }

    // ─── Passenger: Profile with booking history ───────────────────────────
    @Transactional(readOnly = true)
    public UserProfileResponse getPassengerProfile(String email) {
        User user = getUser(email);
        List<BookingResponse> history = bookingRepository.findByPassenger(user).stream()
                .map(this::toBookingResponse)
                .collect(Collectors.toList());

        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .bookingHistory(history)
                .build();
    }

    // ─── Driver: Complete a ride ───────────────────────────────────────────
    @Transactional
    public String completeRide(Long rideId, String driverEmail) {
        User driver = getUser(driverEmail);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not authorized to complete this ride");
        }

        // Get all paid bookings for this ride
        List<Booking> paidBookings = bookingRepository.findByRideAndStatus(ride, BookingStatus.PAID);

        double totalEarnings = 0.0;
        for (Booking booking : paidBookings) {
            double rideAmount = booking.getTotalFare();
            double platformFee = rideAmount * 0.10; // 10% platform fee
            double driverEarnings = rideAmount - platformFee;
            totalEarnings += driverEarnings;

            // Update booking status to COMPLETED
            booking.setStatus(BookingStatus.COMPLETED);
            bookingRepository.save(booking);
        }

        // Credit to driver's wallet
        driver.setDriverWalletBalance(driver.getDriverWalletBalance() + totalEarnings);
        userRepository.save(driver);

        // Update ride status to completed and publish via WebSocket
        ride.setStatus(RideStatus.RIDE_COMPLETED);
        rideRepository.save(ride);
        rideStatusPublisher.publishRideStatus(rideId, RideStatus.RIDE_COMPLETED);

        // Mark driver available at destination for next assignment
        DriverStatus driverStatus = driverStatusRepository.findByDriverId(driver.getId())
                .orElse(new DriverStatus());
        driverStatus.setDriverId(driver.getId());
        driverStatus.setCurrentCity(resolveCity(ride.getDestination(), ride.getSource()));
        driverStatus.setIsAvailable(true);
        driverStatus.setLastUpdated(LocalDateTime.now());
        driverStatusRepository.save(driverStatus);

        return "Ride #" + rideId + " completed successfully. Earnings credited: ₹" + totalEarnings;
    }

    // ─── Driver: Accept a ride ─────────────────────────────────────────────
    @Transactional
    public String acceptRide(Long rideId, String driverEmail) {
        User driver = getUser(driverEmail);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not authorized to accept this ride");
        }

        if (ride.getStatus() != RideStatus.PENDING) {
            throw new RuntimeException("Ride status is " + ride.getStatus() + ", cannot accept");
        }

        // Update ride status to DRIVER_ASSIGNED
        ride.setStatus(RideStatus.DRIVER_ASSIGNED);
        rideRepository.save(ride);
        rideStatusPublisher.publishRideStatus(rideId, RideStatus.DRIVER_ASSIGNED);

        // Mark driver as unavailable
        DriverStatus driverStatus = driverStatusRepository.findByDriverId(driver.getId())
                .orElse(new DriverStatus());
        driverStatus.setDriverId(driver.getId());
        driverStatus.setCurrentCity(resolveCity(ride.getSource(), ride.getDestination()));
        driverStatus.setIsAvailable(false);
        driverStatus.setLastUpdated(LocalDateTime.now());
        driverStatusRepository.save(driverStatus);

        return "Ride #" + rideId + " accepted! Heading to pickup location.";
    }

    // ─── Driver: Start a ride ──────────────────────────────────────────────
    @Transactional
    public String startRide(Long rideId, String driverEmail) {
        User driver = getUser(driverEmail);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not authorized to start this ride");
        }

        if (ride.getStatus() != RideStatus.DRIVER_ASSIGNED) {
            throw new RuntimeException("Ride status is " + ride.getStatus() + ", cannot start");
        }

        // Update ride status to RIDE_STARTED
        ride.setStatus(RideStatus.RIDE_STARTED);
        rideRepository.save(ride);
        rideStatusPublisher.publishRideStatus(rideId, RideStatus.RIDE_STARTED);

        DriverStatus driverStatus = driverStatusRepository.findByDriverId(driver.getId())
                .orElse(new DriverStatus());
        driverStatus.setDriverId(driver.getId());
        driverStatus.setCurrentCity(resolveCity(ride.getSource(), ride.getDestination()));
        driverStatus.setIsAvailable(false);
        driverStatus.setLastUpdated(LocalDateTime.now());
        driverStatusRepository.save(driverStatus);

        return "Ride #" + rideId + " started! On your way to destination.";
    }

    // ─── Driver: Cancel a ride ────────────────────────────────────────────
    @Transactional
    public String cancelRide(Long rideId, String reason, String driverEmail) {
        User driver = getUser(driverEmail);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not authorized to cancel this ride");
        }

        if (ride.getStatus() == RideStatus.RIDE_COMPLETED || ride.getStatus() == RideStatus.CANCELLED) {
            throw new RuntimeException("Ride status is " + ride.getStatus() + ", cannot cancel");
        }

        // Update ride status to CANCELLED
        ride.setStatus(RideStatus.CANCELLED);
        rideRepository.save(ride);
        rideStatusPublisher.publishRideStatus(rideId, RideStatus.CANCELLED);

        // Refund any paid bookings
        List<Booking> paidBookings = bookingRepository.findByRideAndStatus(ride, BookingStatus.PAID);
        for (Booking booking : paidBookings) {
            booking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(booking);
            // TODO: Process refund to passenger's wallet or payment method
        }

        // Mark driver as available again
        DriverStatus driverStatus = driverStatusRepository.findByDriverId(driver.getId())
                .orElse(new DriverStatus());
        driverStatus.setDriverId(driver.getId());
        driverStatus.setCurrentCity(resolveCity(ride.getSource(), ride.getDestination()));
        driverStatus.setIsAvailable(true);
        driverStatus.setLastUpdated(LocalDateTime.now());
        driverStatusRepository.save(driverStatus);

        return "Ride #" + rideId + " cancelled. Reason: " + reason;
    }

    public String deleteRide(Long rideId, String driverEmail) {
        User driver = getUser(driverEmail);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("You are not authorized to delete this ride");
        }

        if (ride.getStatus() != RideStatus.RIDE_COMPLETED) {
            throw new RuntimeException("Only completed rides can be deleted");
        }

        // Delete the ride from database
        rideRepository.delete(ride);

        return "Ride #" + rideId + " deleted successfully";
    }

    // ─── Driver: Wallet balance ────────────────────────────────────────────
    @Transactional(readOnly = true)
    public double getDriverWalletBalance(String driverEmail) {
        User driver = getUser(driverEmail);
        return driver.getDriverWalletBalance();
    }

    // ─── Driver: Profile ───────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public UserProfileResponse getDriverProfile(String email) {
        User user = getUser(email);
        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .carModel(user.getCarModel())
                .licensePlate(user.getLicensePlate())
                .vehicleCapacity(user.getVehicleCapacity())
                .vehicleType(user.getVehicleType())
                .rating(user.getRating())
                .ratingCount(user.getRatingCount())
                .build();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────
    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    private String resolveCity(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback;
        }
        return "UNKNOWN";
    }

    /**
     * Convert ride entity to DTO using the ride's own pickup/drop coordinates.
     * This version is used by endpoints that return rides independently of a
     * passenger search (for example, when a driver views their posted rides).
     */
    private RideResponse toRideResponse(Ride ride) {
        double calculatedFarePerSeat = fareService.calculateFarePerSeatForRide(ride);
        double distanceKm = fareService.getDistanceForRide(ride);

        return RideResponse.builder()
                .id(ride.getId())
                .source(ride.getSource())
                .destination(ride.getDestination())
                .date(ride.getDate())
                .time(ride.getTime())
                .availableSeats(ride.getAvailableSeats())
                .price(ride.getPrice())
                .calculatedFarePerSeat(Math.round(calculatedFarePerSeat * 100.0) / 100.0)
                .distanceKm(Math.round(distanceKm * 10.0) / 10.0)
                .driverName(ride.getDriver().getName())
                .driverRating(ride.getDriver().getRating())
                .vehicleType(ride.getVehicleType())
                .carModel(ride.getCarModel())
                .licensePlate(ride.getLicensePlate())
                .status(ride.getStatus())
                .build();
    }

    /**
     * Convert ride entity to DTO using a precomputed distance.  This is called
     * from the search endpoint so that every ride returned shows the same
     * OSRM-derived distance that was used when the passenger entered the route.
     */
    private RideResponse toRideResponse(Ride ride, double distanceKm) {
        double calculatedFarePerSeat = fareService.calculateFarePerSeatForDistance(distanceKm);

        return RideResponse.builder()
                .id(ride.getId())
                .source(ride.getSource())
                .destination(ride.getDestination())
                .date(ride.getDate())
                .time(ride.getTime())
                .availableSeats(ride.getAvailableSeats())
                .price(ride.getPrice())
                .calculatedFarePerSeat(Math.round(calculatedFarePerSeat * 100.0) / 100.0)
                .distanceKm(Math.round(distanceKm * 10.0) / 10.0)
                .driverName(ride.getDriver().getName())
                .driverRating(ride.getDriver().getRating())
                .vehicleType(ride.getVehicleType())
                .carModel(ride.getCarModel())
                .licensePlate(ride.getLicensePlate())
                .status(ride.getStatus())
                .build();
    }

    private BookingResponse toBookingResponse(Booking booking) {
        Ride ride = booking.getRide();
        return BookingResponse.builder()
                .bookingId(booking.getId())
                .rideId(ride.getId())
                .source(ride.getSource())
                .destination(ride.getDestination())
                .date(ride.getDate())
                .time(ride.getTime())
                .seatCount(booking.getSeatCount())
                .totalFare(booking.getTotalFare())
                .bookingTime(booking.getBookingTime())
                .driverName(ride.getDriver().getName())
                .driverId(ride.getDriver().getId())
                .passengerName(booking.getPassenger().getName())
                .status(booking.getStatus())
                .rideStatus(ride.getStatus())
                .build();
    }
}
