package com.signbridge.project.dto;

public record CardSaveRequest(String badge, String color, String expiry, Integer maxUses, Boolean regenerate) {
}