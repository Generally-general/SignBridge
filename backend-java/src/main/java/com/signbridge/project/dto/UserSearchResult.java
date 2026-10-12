package com.signbridge.project.dto;

/** What a stranger is allowed to see: no id, no email. */
public record UserSearchResult(String username, String fullName, String relationship) {
}
