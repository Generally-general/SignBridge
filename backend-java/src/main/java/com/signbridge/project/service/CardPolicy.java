package com.signbridge.project.service;

import com.signbridge.project.entity.ContactCard;
import com.signbridge.project.exception.BadRequestException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public final class CardPolicy {
    public static final Set<String> BADGES = Set.of(
            "open", "flat", "fist", "point", "peace", "ily", "thumbsup", "ok", "three", "call", "rock", "four");
    public static final Set<String> COLORS = Set.of(
            "sky", "violet", "rose", "amber", "emerald", "teal", "orange", "slate");
    public static final List<Integer> USE_LIMITS = List.of(1, 5, 20);

    public static final String DEFAULT_BADGE = "open";
    public static final String DEFAULT_COLOR = "sky";
    public static final String DEFAULT_EXPIRY = "MONTH";

    private CardPolicy() {
    }

    public static String badge(String requested, String current) {
        String value = requested == null ? (current == null ? DEFAULT_BADGE : current) : requested;
        if (!BADGES.contains(value)) {
            throw new BadRequestException("Pick one of the hand shapes");
        }
        return value;
    }

    public static String color(String requested, String current) {
        String value = requested == null ? (current == null ? DEFAULT_COLOR : current) : requested;
        if (!COLORS.contains(value)) {
            throw new BadRequestException("Pick one of the colours");
        }
        return value;
    }

    public static LocalDateTime expiryFrom(String option, LocalDateTime now) {
        return switch (option) {
            case "DAY" -> now.plus(Duration.ofDays(1));
            case "WEEK" -> now.plus(Duration.ofDays(7));
            case "MONTH" -> now.plus(Duration.ofDays(30));
            case "NEVER" -> null;
            default -> throw new BadRequestException("Choose how long the link should work");
        };
    }

    /** 0 means unlimited (stored as null). */
    public static Integer maxUses(int requested) {
        if (requested == 0) {
            return null;
        }
        if (!USE_LIMITS.contains(requested)) {
            throw new BadRequestException("Choose how many people can use the link");
        }
        return requested;
    }

    public static boolean isUsable(ContactCard card, LocalDateTime now) {
        if (card == null) {
            return false;
        }
        if (card.getExpiresAt() != null && !card.getExpiresAt().isAfter(now)) {
            return false;
        }
        return card.getMaxUses() == null || card.getUses() < card.getMaxUses();
    }
}