package com.smartride.smartride.service;

import com.smartride.smartride.dto.*;
import com.smartride.smartride.entity.Role;
import com.smartride.smartride.entity.User;
import com.smartride.smartride.repository.UserRepository;
import com.smartride.smartride.security.JwtUtil;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Random;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JavaMailSender mailSender;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       JavaMailSender mailSender) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.mailSender = mailSender;
    }

    // ─── Register ────────────────────────────────────────────────────────────
    // @Transactional ensures: if email sending fails → RuntimeException is thrown
    // → Spring rolls back the userRepository.save() automatically.
    // Without this, user would be stuck in DB: can't login (unverified),
    // can't re-register (email already exists).
    @Transactional
    public String register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("EMAIL_ALREADY_EXISTS");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("PHONE_ALREADY_EXISTS");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());

        if (request.getRole() == Role.DRIVER) {
            user.setCarModel(request.getCarModel());
            user.setLicensePlate(request.getLicensePlate());
            user.setVehicleCapacity(request.getVehicleCapacity());
            user.setVehicleType(request.getVehicleType());
        }

        String otp = String.valueOf(new Random().nextInt(900000) + 100000);
        user.setOtp(otp);
        user.setVerified(false);

        userRepository.save(user);  // saved inside transaction

        // If this throws, the entire transaction rolls back including the save above
        sendOtpEmail(user.getEmail(), otp);

        return "Registration successful. Please verify your email with the OTP sent.";
    }

    // ─── Verify OTP ──────────────────────────────────────────────────────────
    @Transactional
    public String verifyOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!request.getOtp().equals(user.getOtp())) {
            throw new RuntimeException("Invalid OTP");
        }

        user.setVerified(true);
        user.setOtp(null);
        userRepository.save(user);
        return "Email verified successfully. You can now login.";
    }

    // ─── Login (email OR phone) ───────────────────────────────────────────────
    public LoginResponse login(LoginRequest request) {
        User user;

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));
        } else if (request.getPhone() != null && !request.getPhone().isBlank()) {
            user = userRepository.findByPhone(request.getPhone())
                    .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));
        } else {
            throw new RuntimeException("Please provide email or phone to login");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("INVALID_PASSWORD");
        }

        if (!user.isVerified()) {
            throw new RuntimeException("EMAIL_NOT_VERIFIED");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());
        return new LoginResponse(token);
    }

    // ─── Get user by email ────────────────────────────────────────────────────
    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── Update driver rating (called from RideService @Transactional context) ─
    @Transactional
    public void updateDriverRating(User driver, int newRating) {
        double currentTotal = driver.getRating() * driver.getRatingCount();
        int newCount = driver.getRatingCount() + 1;
        double newAvg = (currentTotal + newRating) / newCount;

        driver.setRating(Math.round(newAvg * 10.0) / 10.0);
        driver.setRatingCount(newCount);
        userRepository.save(driver);
    }

    // ─── Mail helper ─────────────────────────────────────────────────────────
    private void sendOtpEmail(String to, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("SmartRide - Email Verification OTP");
            message.setText("Your OTP for SmartRide registration is: " + otp
                    + "\nThis OTP is valid for 10 minutes.");
            mailSender.send(message);
        } catch (Exception e) {
            // Throw RuntimeException so @Transactional rolls back the user save
            throw new RuntimeException("MAIL_ERROR");
        }
    }
}
