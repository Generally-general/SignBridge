package com.signbridge.project.util;

import java.nio.charset.StandardCharsets;

public final class PasswordPolicy {
    public static final int MIN_LENGTH = 8;
    /** BCrypt only reads the first 72 bytes, so longer input would be silently cut. */
    public static final int MAX_BYTES = 72;

    private PasswordPolicy() {
    }

    /** Returns a message for the user, or null when the password is acceptable. */
    public static String problem(String password) {
        if (password == null || password.isBlank()) {
            return "Password is required";
        }
        if (password.length() < MIN_LENGTH) {
            return "Password must be at least " + MIN_LENGTH + " characters";
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            return "Password is too long (72 bytes at most)";
        }
        return null;
    }
}