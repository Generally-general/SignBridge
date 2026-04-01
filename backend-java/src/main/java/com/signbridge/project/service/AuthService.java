package com.signbridge.project.service;

import com.signbridge.project.dto.LoginResponse;
import com.signbridge.project.dto.UserRequest;
import com.signbridge.project.dto.UserResponse;
import com.signbridge.project.entity.User;
import com.signbridge.project.exception.AuthenticationException;
import com.signbridge.project.exception.ConflictException;
import com.signbridge.project.exception.ResourceNotFoundException;
import com.signbridge.project.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserResponse registerUser(UserRequest request) {
        if(userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already exists");
        }
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        User savedUser = userRepository.saveAndFlush(user);

        return toResponse(savedUser);
    }

    public LoginResponse login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Invalid Credentials"
                ));

        if(!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new AuthenticationException("Invalid Credentials");
        }

        UserResponse response = toResponse(user);

        String accessToken = jwtService.generateToken(email, user.getId());
        String refreshToken = jwtService.generateRefreshToken(email);

        return new LoginResponse(response, accessToken, refreshToken);
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .build();
    }
}
