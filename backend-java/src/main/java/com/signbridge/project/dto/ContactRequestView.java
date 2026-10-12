package com.signbridge.project.dto;

import java.time.LocalDateTime;

public record ContactRequestView(Long requestId, String username, String fullName, LocalDateTime createdAt) {
}
