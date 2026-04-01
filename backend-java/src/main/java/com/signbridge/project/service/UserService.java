package com.signbridge.project.service;

import com.signbridge.project.dto.UserResponse;
import com.signbridge.project.entity.User;
import com.signbridge.project.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public User saveUser(User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public Page<UserResponse> getUsers(
            String email,
            Pageable pageable
    ) {
        Page<User> page;
        if(email != null) {
            page = userRepository
                    .findByEmailContainingIgnoreCase(
                            email, pageable);
        } else {
            page = userRepository.findAll(pageable);
        }

        return page.map(this::toResponse);
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .build();
    }
}
