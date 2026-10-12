package com.signbridge.project.dto;

/** Every field is optional; only the ones sent are changed. */
public record ProfileUpdateRequest(String username, String fullName, Boolean searchable) {
}
