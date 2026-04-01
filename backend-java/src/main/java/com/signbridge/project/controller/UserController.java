package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.UserResponse;
import com.signbridge.project.entity.User;
import com.signbridge.project.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin
@RequiredArgsConstructor
public class UserController {

    public final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @RequestParam(required = false) String email,
            @PageableDefault(size = 10, sort = "id")
            Pageable pageable
    ) {
        Page<UserResponse> page = userService.getUsers(email, pageable);
        return ResponseEntity.ok(new ApiResponse<>(true, "Users fetched", page));
    }

//    @GetMapping("/{id}")
//    public ResponseEntity<ApiResponse<UserResponse>> getUserById(
//            @AuthenticationPrincipal User authenticatedUser,
//            @PathVariable Integer id
//    ) {
//        UserResponse response = userService.getUserResponseByIdOrThrow(id);
//    }
}
