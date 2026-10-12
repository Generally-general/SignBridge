package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.ContactSummary;
import com.signbridge.project.dto.ProfileUpdateRequest;
import com.signbridge.project.dto.UserResponse;
import com.signbridge.project.dto.UserSearchResult;
import com.signbridge.project.entity.User;
import com.signbridge.project.service.ContactService;
import com.signbridge.project.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.signbridge.project.dto.ChangePasswordRequest;
import com.signbridge.project.dto.LoginResponse;
import com.signbridge.project.service.AuthService;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final ContactService contactService;
    private final AuthService authService;

    /**
     * Same response shape the dashboard already reads, but it now lists only the caller's contacts.
     * It never returns other people's emails, and never accounts that are not contacts.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getContacts(@AuthenticationPrincipal User me) {
        List<ContactSummary> contacts = contactService.listContacts(me);
        List<UserResponse> shaped = contacts.stream()
                .map(c -> UserResponse.builder().id(c.id()).fullName(c.fullName()).username(c.username()).build())
                .toList();
        return ResponseEntity.ok(new ApiResponse<>(true, "Contacts fetched", new PageImpl<>(shaped)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<UserSearchResult>>> search(
            @AuthenticationPrincipal User me,
            @RequestParam(name = "q", defaultValue = "") String q) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Search results", contactService.search(me, q)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(@AuthenticationPrincipal User me) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Profile fetched", userService.toResponse(me)));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<LoginResponse>> changePassword(
            @AuthenticationPrincipal User me, @Valid @RequestBody ChangePasswordRequest body) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Password changed",
                authService.changePassword(me.getId(), body.currentPassword(), body.newPassword())));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateMe(
            @AuthenticationPrincipal User me, @RequestBody ProfileUpdateRequest body) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Profile updated", userService.updateProfile(me.getId(), body)));
    }
}
