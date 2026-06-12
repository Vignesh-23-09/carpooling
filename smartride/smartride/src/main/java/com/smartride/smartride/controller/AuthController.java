package com.smartride.smartride.controller;

import com.smartride.smartride.dto.LoginRequest;
import com.smartride.smartride.dto.RegisterRequest;
import com.smartride.smartride.dto.VerifyOtpRequest;
import com.smartride.smartride.security.TokenBlacklistService;
import com.smartride.smartride.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final TokenBlacklistService blacklistService;

    public AuthController(UserService userService, TokenBlacklistService blacklistService) {
        this.userService = userService;
        this.blacklistService = blacklistService;
    }

    @GetMapping("/test")
    public String test() {
        return "Backend is working!";
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            System.out.println("Register request: " + request.getEmail() + ", Role: " + request.getRole());
            return ResponseEntity.ok(userService.register(request));
        } catch (RuntimeException e) {
            System.err.println("Registration error: " + e.getMessage());
            if ("EMAIL_ALREADY_EXISTS".equals(e.getMessage()))
                return ResponseEntity.status(409).body("Email already registered");
            if ("PHONE_ALREADY_EXISTS".equals(e.getMessage()))
                return ResponseEntity.status(409).body("Phone number already registered");
            if ("MAIL_ERROR".equals(e.getMessage()))
                return ResponseEntity.status(500).body("Failed to send OTP email. Please try again.");
            return ResponseEntity.badRequest().body(e.getMessage() != null ? e.getMessage() : "Registration failed");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Server error: " + e.getMessage());
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody VerifyOtpRequest request) {
        try {
            return ResponseEntity.ok(userService.verifyOtp(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(userService.login(request));
        } catch (RuntimeException e) {
            return switch (e.getMessage()) {
                case "USER_NOT_FOUND"      -> ResponseEntity.status(404).body("User not found");
                case "INVALID_PASSWORD"    -> ResponseEntity.status(401).body("Invalid password");
                case "EMAIL_NOT_VERIFIED"  -> ResponseEntity.status(403).body("Please verify your email first");
                default                    -> ResponseEntity.badRequest().body(e.getMessage());
            };
        }
    }

    /**
     * Logout: blacklists the token so it can't be used again.
     * Client should also delete the token from storage.
     */
    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            blacklistService.blacklist(token);
            return ResponseEntity.ok("Logged out successfully.");
        }
        return ResponseEntity.badRequest().body("No token provided.");
    }
}
