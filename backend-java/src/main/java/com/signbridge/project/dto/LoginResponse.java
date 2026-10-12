package com.signbridge.project.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private UserResponse userResponse;
    private String token;
    private String refreshToken;
}
