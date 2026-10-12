package com.signbridge.project.controller;

import com.signbridge.project.dto.*;
import com.signbridge.project.entity.User;
import com.signbridge.project.service.AuthService;
import com.signbridge.project.service.PasswordResetService;
import com.signbridge.project.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(
            @RequestBody UserRequest request
    ) {
        UserResponse response = authService.registerUser(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Registration Successful", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        LoginResponse response = authService.login(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(new ApiResponse<>(true, "Login Successful", response));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(new ApiResponse<>(true,
                "If an account exists for that email, a reset link is on its way.", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(new ApiResponse<>(true, "Password updated", null));
    }

    @GetMapping("/username-available")
    public ResponseEntity<ApiResponse<UsernameAvailability>> usernameAvailable(
            @RequestParam(name = "u", defaultValue = "") String username
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Checked", authService.checkUsername(username))
        );
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMe(
            @AuthenticationPrincipal User authenticatedUser
    ) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Profile fetched", authService.toResponse(authenticatedUser))
        );
    }
}
