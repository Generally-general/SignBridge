package com.signbridge.project.util;

import java.util.Locale;
import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * Rules for the public @username (GitHub / Instagram style).
 * 3-20 characters: lowercase letters, digits and underscore. Stored lowercase.
 */
public final class UsernamePolicy {
    public static final int MIN_LENGTH = 3;
    public static final int MAX_LENGTH = 20;

    private static final Pattern VALID = Pattern.compile("^[a-z0-9_]{3,20}$");
    private static final Pattern INVALID_CHARS = Pattern.compile("[^a-z0-9_]");
    private static final Pattern UNDERSCORE_RUNS = Pattern.compile("_+");

    private static final Set<String> RESERVED = Set.of(
            "admin", "administrator", "root", "support", "help", "signbridge", "system",
            "null", "undefined", "api", "www", "me", "settings", "login", "signup",
            "contact", "contacts", "user", "users", "official", "staff");

    private UsernamePolicy() {
    }

    public static String normalize(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    }

    /** Why the username cannot be used, or null when it is acceptable. */
    public static String problem(String raw) {
        String n = normalize(raw);
        if (n.length() < MIN_LENGTH || n.length() > MAX_LENGTH) {
            return "Username must be " + MIN_LENGTH + "-" + MAX_LENGTH + " characters";
        }
        if (!VALID.matcher(n).matches()) {
            return "Use only lowercase letters, numbers and underscore";
        }
        if (RESERVED.contains(n)) {
            return "That username is reserved";
        }
        return null;
    }

    public static boolean isValid(String raw) {
        return problem(raw) == null;
    }

    /** A valid starting point derived from an email address (before any uniqueness suffix). */
    public static String suggestFromEmail(String email) {
        String local = normalize(email);
        int at = local.indexOf('@');
        if (at >= 0) {
            local = local.substring(0, at);
        }
        String base = INVALID_CHARS.matcher(local).replaceAll("_");
        base = UNDERSCORE_RUNS.matcher(base).replaceAll("_");
        base = trimUnderscores(base);
        if (base.isEmpty()) {
            base = "member"; // "user" itself is reserved
        }
        if (base.length() > 16) { // leave room for a numeric suffix
            base = trimUnderscores(base.substring(0, 16));
        }
        if (base.length() < MIN_LENGTH || RESERVED.contains(base)) {
            base = base + "_user";
        }
        return base;
    }

    public static String withSuffix(String base, int n) {
        String suffix = String.valueOf(n);
        String head = base.length() + suffix.length() > MAX_LENGTH
                ? base.substring(0, MAX_LENGTH - suffix.length())
                : base;
        return head + suffix;
    }

    /** First unused username: the base itself, then base2, base3, ... */
    public static String firstFree(String base, Predicate<String> taken) {
        if (!taken.test(base)) {
            return base;
        }
        for (int i = 2; i < 100_000; i++) {
            String candidate = withSuffix(base, i);
            if (!taken.test(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("No free username for " + base);
    }

    private static String trimUnderscores(String s) {
        int start = 0;
        int end = s.length();
        while (start < end && s.charAt(start) == '_') start++;
        while (end > start && s.charAt(end - 1) == '_') end--;
        return s.substring(start, end);
    }
}
