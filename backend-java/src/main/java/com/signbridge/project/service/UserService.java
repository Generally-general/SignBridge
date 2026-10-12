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
import com.signbridge.project.dto.ProfileUpdateRequest;
import com.signbridge.project.exception.BadRequestException;
import com.signbridge.project.exception.ConflictException;
import com.signbridge.project.util.UsernamePolicy;

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
            Integer currentUserId,
            String email,
            Pageable pageable
    ) {
        Page<User> page;
        if(email != null && !email.isEmpty()) {
            page = userRepository
                    .findByEmailContainingIgnoreCaseAndIdNot(
                            email, currentUserId, pageable);
        } else {
            page = userRepository.findAllByIdNot(currentUserId, pageable);
        }

        return page.map(this::toResponse);
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public UserResponse updateProfile(Integer userId, ProfileUpdateRequest request) {
        User user = userRepository.findById(userId).orElseThrow();

        if (request.fullName() != null) {
            String name = request.fullName().trim();
            if (name.isEmpty() || name.length() > 100) {
                throw new BadRequestException("Name must be 1-100 characters");
            }
            user.setFullName(name);
        }
        if (request.username() != null) {
            String wanted = UsernamePolicy.normalize(request.username());
            if (!wanted.equals(user.getHandle())) {
                String problem = UsernamePolicy.problem(wanted);
                if (problem != null) {
                    throw new BadRequestException(problem);
                }
                if (userRepository.existsByHandle(wanted)) {
                    throw new ConflictException("Username already taken");
                }
                user.setHandle(wanted);
            }
        }
        if (request.searchable() != null) {
            user.setSearchable(request.searchable());
        }
        return toResponse(userRepository.saveAndFlush(user));
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
