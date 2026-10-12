package com.signbridge.project.service;

import com.signbridge.project.dto.LoginResponse;
import com.signbridge.project.dto.UserRequest;
import com.signbridge.project.dto.UserResponse;
import com.signbridge.project.entity.User;
import com.signbridge.project.exception.AuthenticationException;
import com.signbridge.project.exception.ConflictException;
import com.signbridge.project.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.signbridge.project.dto.UsernameAvailability;
import com.signbridge.project.exception.BadRequestException;
import com.signbridge.project.util.UsernamePolicy;
import com.signbridge.project.util.PasswordPolicy;

import java.time.LocalDateTime;
import java.time.ZoneOffset;


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
        String passwordProblem = PasswordPolicy.problem(request.getPassword());
        if (passwordProblem != null) {
            throw new BadRequestException(passwordProblem);
        }
        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .handle(chooseHandle(request.getUsername(), request.getEmail()))
                .searchable(true)
                .build();

        User savedUser = userRepository.saveAndFlush(user);

        return toResponse(savedUser);
    }

    public LoginResponse login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthenticationException(
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

    public LoginResponse changePassword(Integer userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationException("Invalid Credentials"));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        String problem = PasswordPolicy.problem(newPassword);
        if (problem != null) {
            throw new BadRequestException(problem);
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("Choose a password you have not used on this account");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now(ZoneOffset.UTC));
        userRepository.saveAndFlush(user);

        return new LoginResponse(
                toResponse(user),
                jwtService.generateToken(user.getEmail(), user.getId()),
                jwtService.generateRefreshToken(user.getEmail()));
    }

    private String chooseHandle(String requested, String email) {
        if (requested == null || requested.isBlank()) {
            return UsernamePolicy.firstFree(UsernamePolicy.suggestFromEmail(email), userRepository::existsByHandle);
        }
        String problem = UsernamePolicy.problem(requested);
        if (problem != null) {
            throw new BadRequestException(problem);
        }
        String handle = UsernamePolicy.normalize(requested);
        if (userRepository.existsByHandle(handle)) {
            throw new ConflictException("Username already taken");
        }
        return handle;
    }

    public UsernameAvailability checkUsername(String raw) {
        String problem = UsernamePolicy.problem(raw);
        if (problem != null) {
            return new UsernameAvailability(false, problem);
        }
        return userRepository.existsByHandle(UsernamePolicy.normalize(raw))
                ? new UsernameAvailability(false, "Username already taken")
                : new UsernameAvailability(true, null);
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .username(user.getHandle())
                .searchable(user.isDiscoverable())
                .build();
    }
}
