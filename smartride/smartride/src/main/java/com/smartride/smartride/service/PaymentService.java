package com.smartride.smartride.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.smartride.smartride.dto.PaymentOrderResponse;
import com.smartride.smartride.dto.PaymentVerifyRequest;
import com.smartride.smartride.dto.TransactionHistoryItem;
import com.smartride.smartride.dto.ReceiptDTO;
import com.smartride.smartride.service.OsrmDistanceService;
import com.smartride.smartride.entity.Booking;
import com.smartride.smartride.entity.BookingStatus;
import com.smartride.smartride.entity.Transaction;
import com.smartride.smartride.entity.User;
import com.smartride.smartride.repository.BookingRepository;
import com.smartride.smartride.repository.TransactionRepository;
import com.smartride.smartride.repository.UserRepository;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private final RazorpayClient razorpayClient;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;
    private final BookingRepository bookingRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final OsrmDistanceService osrmDistanceService;

    public PaymentService(@Value("${razorpay.keyId}") String razorpayKeyId,
                          @Value("${razorpay.keySecret}") String razorpayKeySecret,
                          BookingRepository bookingRepository,
                          TransactionRepository transactionRepository,
                          UserRepository userRepository,
                          OsrmDistanceService osrmDistanceService) throws RazorpayException {
        this.razorpayKeyId = razorpayKeyId;
        this.razorpayKeySecret = razorpayKeySecret;
        this.razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        this.bookingRepository = bookingRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.osrmDistanceService = osrmDistanceService;
    }

    @Transactional
    public PaymentOrderResponse createOrderForBooking(Long bookingId) {
        System.out.println("=== RAZORPAY ORDER CREATION START ===");
        System.out.println("Booking ID: " + bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        Double totalAmount = booking.getTotalFare();
        if (totalAmount == null || totalAmount <= 0) {
            throw new RuntimeException("Invalid total fare amount for booking");
        }

        // Use stored distance from booking to ensure consistency with UI estimate
        Double storedDistance = booking.getEstimatedDistanceKm();
        double distanceKm = storedDistance != null ? storedDistance : 0.0;
        double distanceMeters = distanceKm * 1000.0;
        double farePerSeat = booking.getFare();
        int seatCount = booking.getSeatCount();

        System.out.println("Booking uses stored distance: " + distanceKm + " km");
        System.out.println("Distance meters: " + distanceMeters);
        System.out.println("Fare per seat (from booking): " + farePerSeat);
        System.out.println("Seat count: " + seatCount);
        System.out.println("Total amount (from booking): " + totalAmount);
        System.out.println("This ensures Razorpay payment amount matches UI estimate.");

        try {
            JSONObject options = new JSONObject();
            int amountInPaise = (int) Math.round(totalAmount * 100);
            options.put("amount", amountInPaise);
            options.put("currency", "INR");
            options.put("receipt", "ride_booking_" + booking.getId());

            System.out.println("Creating Razorpay order with amount: " + amountInPaise + " paise");

            Order order = razorpayClient.orders.create(options);
            String orderId = order.get("id");
            int amount = order.get("amount");
            String currency = order.get("currency");

            System.out.println("Razorpay order created successfully:");
            System.out.println("Order ID: " + orderId);
            System.out.println("Amount: " + amount);
            System.out.println("Currency: " + currency);

            booking.setRazorpayOrderId(orderId);
            booking.setPaymentStatus("pending");
            bookingRepository.save(booking);

            System.out.println("=== RAZORPAY ORDER CREATION END ===");

            return new PaymentOrderResponse(orderId, amount, currency, razorpayKeyId, booking.getId());
        } catch (RazorpayException e) {
            System.err.println("Razorpay order creation failed: " + e.getMessage());
            System.err.println("=== RAZORPAY ORDER CREATION END ===");
            throw new RuntimeException("Failed to create Razorpay order", e);
        }
    }

    @Transactional
    public void verifyPayment(PaymentVerifyRequest request, String passengerEmail) {
        System.out.println("=== PAYMENT VERIFICATION START ===");
        System.out.println("Order ID: " + request.getRazorpayOrderId());
        System.out.println("Payment ID: " + request.getRazorpayPaymentId());
        System.out.println("Signature: " + request.getRazorpaySignature());
        System.out.println("Booking ID: " + request.getBookingId());

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // Verify the passenger owns the booking
        if (!booking.getPassenger().getEmail().equals(passengerEmail)) {
            throw new RuntimeException("Unauthorized: You do not own this booking");
        }

        String data = request.getRazorpayOrderId() + "|" + request.getRazorpayPaymentId();
        String computed = hmacSha256(data, razorpayKeySecret);
        boolean valid = computed.equals(request.getRazorpaySignature());

        System.out.println("Expected signature: " + computed);
        System.out.println("Received signature: " + request.getRazorpaySignature());
        System.out.println("Signature valid: " + valid);

        BookingStatus newStatus = valid ? BookingStatus.PAID : BookingStatus.PAYMENT_FAILED;
        booking.setStatus(newStatus);
        booking.setRazorpayPaymentId(request.getRazorpayPaymentId());
        bookingRepository.save(booking);

        User user = booking.getPassenger();

        System.out.println("Payment verification result: " + (valid ? "SUCCESS" : "FAILED"));
        System.out.println("=== PAYMENT VERIFICATION END ===");

        if (!valid) {
            throw new RuntimeException("Invalid Razorpay signature");
        }
    }

    @Transactional(readOnly = true)
    public List<TransactionHistoryItem> getTransactionsForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return transactionRepository.findByUser(user).stream()
                .map(tx -> new TransactionHistoryItem(
                        tx.getBooking() != null ? tx.getBooking().getId() : null,
                        tx.getAmount(),
                        tx.getStatus(),
                        tx.getRazorpayPaymentId(),
                        tx.getCreatedAt().toLocalDate()
                ))
                .collect(Collectors.toList());
    }

    private String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(rawHmac);
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute HMAC", e);
        }
    }

    /**
     * Get receipt details for a completed booking
     */
    @Transactional(readOnly = true)
    public com.smartride.smartride.dto.ReceiptDTO getReceipt(Long bookingId, String userEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // Verify user is either passenger or driver
        boolean isPassenger = booking.getPassenger().getEmail().equals(userEmail);
        boolean isDriver = booking.getRide().getDriver().getEmail().equals(userEmail);

        if (!isPassenger && !isDriver) {
            throw new RuntimeException("Unauthorized: You do not have access to this receipt");
        }

        com.smartride.smartride.dto.ReceiptDTO receipt = new com.smartride.smartride.dto.ReceiptDTO();
        receipt.setBookingId(booking.getId());
        receipt.setRideId(booking.getRide().getId());
        receipt.setPassengerName(booking.getPassenger().getName());
        receipt.setDriverName(booking.getRide().getDriver().getName());
        receipt.setSource(booking.getRide().getSource());
        receipt.setDestination(booking.getRide().getDestination());
        receipt.setBookingTime(booking.getBookingTime());
        receipt.setDistanceKm(booking.getEstimatedDistanceKm());
        receipt.setFarePerSeat(booking.getFare());
        receipt.setSeatCount(booking.getSeatCount());
        receipt.setTotalFare(booking.getTotalFare());
        receipt.setPaymentStatus(booking.getStatus().name());
        receipt.setRazorpayPaymentId(booking.getRazorpayPaymentId());
        receipt.setCarModel(booking.getRide().getCarModel());
        receipt.setLicensePlate(booking.getRide().getLicensePlate());
        receipt.setVehicleType(booking.getRide().getVehicleType() != null ? 
            booking.getRide().getVehicleType().name() : "STANDARD");

        return receipt;
    }

    /**
     * Get all receipts/transaction history for user
     */
    @Transactional(readOnly = true)
    public List<com.smartride.smartride.dto.ReceiptDTO> getUserReceipts(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get bookings where user is passenger
        List<Booking> passengerBookings = bookingRepository.findByPassenger(user);

        return passengerBookings.stream()
                .map(booking -> {
                    com.smartride.smartride.dto.ReceiptDTO receipt = new com.smartride.smartride.dto.ReceiptDTO();
                    receipt.setBookingId(booking.getId());
                    receipt.setRideId(booking.getRide().getId());
                    receipt.setPassengerName(booking.getPassenger().getName());
                    receipt.setDriverName(booking.getRide().getDriver().getName());
                    receipt.setSource(booking.getRide().getSource());
                    receipt.setDestination(booking.getRide().getDestination());
                    receipt.setBookingTime(booking.getBookingTime());
                    receipt.setDistanceKm(booking.getEstimatedDistanceKm());
                    receipt.setFarePerSeat(booking.getFare());
                    receipt.setSeatCount(booking.getSeatCount());
                    receipt.setTotalFare(booking.getTotalFare());
                    receipt.setPaymentStatus(booking.getStatus().name());
                    receipt.setRazorpayPaymentId(booking.getRazorpayPaymentId());
                    receipt.setCarModel(booking.getRide().getCarModel());
                    receipt.setLicensePlate(booking.getRide().getLicensePlate());
                    receipt.setVehicleType(booking.getRide().getVehicleType() != null ? 
                        booking.getRide().getVehicleType().name() : "STANDARD");
                    return receipt;
                })
                .collect(Collectors.toList());
    }
}

