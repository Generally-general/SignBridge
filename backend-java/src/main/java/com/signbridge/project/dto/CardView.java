package com.signbridge.project.dto;

import java.time.LocalDateTime;

public record CardView(String token, String badge, String color, LocalDateTime expiresAt, Integer maxUses, int uses) {
}