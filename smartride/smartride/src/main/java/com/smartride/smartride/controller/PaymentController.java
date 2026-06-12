package com.smartride.smartride.controller;

import com.smartride.smartride.dto.PaymentOrderResponse;
import com.smartride.smartride.dto.PaymentVerifyRequest;
import com.smartride.smartride.dto.TransactionHistoryItem;
import com.smartride.smartride.dto.ReceiptDTO;
import com.smartride.smartride.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-order")
    public ResponseEntity<PaymentOrderResponse> createOrder(@RequestParam Long bookingId) {
        PaymentOrderResponse response = paymentService.createOrderForBooking(bookingId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify")
    public ResponseEntity<String> verify(@RequestBody PaymentVerifyRequest request,
                                         Authentication authentication) {
        // authentication principal is the passenger paying for the booking
        paymentService.verifyPayment(request, authentication.getName());
        return ResponseEntity.ok("✓ Payment verified successfully!");
    }

    @GetMapping("/transactions/{userId}")
    public ResponseEntity<List<TransactionHistoryItem>> getTransactions(@PathVariable Long userId) {
        return ResponseEntity.ok(paymentService.getTransactionsForUser(userId));
    }

    /**
     * Get receipt for a specific booking
     */
    @GetMapping("/receipt/{bookingId}")
    public ResponseEntity<ReceiptDTO> getReceipt(@PathVariable Long bookingId,
                                                 Authentication authentication) {
        ReceiptDTO receipt = paymentService.getReceipt(bookingId, authentication.getName());
        return ResponseEntity.ok(receipt);
    }

    /**
     * Get all receipts for the authenticated user
     */
    @GetMapping("/receipts")
    public ResponseEntity<List<ReceiptDTO>> getUserReceipts(Authentication authentication) {
        List<ReceiptDTO> receipts = paymentService.getUserReceipts(authentication.getName());
        return ResponseEntity.ok(receipts);
    }

    /**
     * Download receipt as PDF (can be extended later)
     */
    @GetMapping("/receipt/{bookingId}/download")
    public ResponseEntity<String> downloadReceipt(@PathVariable Long bookingId,
                                                  Authentication authentication) {
        ReceiptDTO receipt = paymentService.getReceipt(bookingId, authentication.getName());
        // TODO: Implement PDF generation and download
        return ResponseEntity.ok("Receipt download endpoint - implementation pending");
    }
}

