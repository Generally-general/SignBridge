package com.signbridge.project.service;

import com.signbridge.project.entity.ContactStatus;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * The contact-request rules, with no database or Spring in them so they can be tested exhaustively.
 * ContactService only loads a link, asks these methods what is allowed, and saves the result.
 */
public final class ContactRules {

    public enum Relationship { NONE, OUTGOING_PENDING, INCOMING_PENDING, CONTACT }

    public enum RequestAction { CREATE, AUTO_ACCEPT, RENEW, ALREADY_PENDING, ALREADY_CONTACT }

    /** A declined request cannot be sent again for this long (and looks "pending" to the sender meanwhile). */
    public static final Duration DECLINE_COOLDOWN = Duration.ofDays(7);

    /** Snapshot of a stored link; use null when there is no row for the pair. */
    public record LinkState(ContactStatus status, int requestedBy, LocalDateTime respondedAt) {
    }

    private ContactRules() {
    }

    public static int low(int a, int b) {
        return Math.min(a, b);
    }

    public static int high(int a, int b) {
        return Math.max(a, b);
    }

    private static boolean withinCooldown(LinkState link, LocalDateTime now) {
        return link.respondedAt() != null
                && link.respondedAt().plus(DECLINE_COOLDOWN).isAfter(now);
    }

    /** How the pair looks from `viewer`'s side. */
    public static Relationship relationship(LinkState link, int viewer, LocalDateTime now) {
        if (link == null) {
            return Relationship.NONE;
        }
        return switch (link.status()) {
            case ACCEPTED -> Relationship.CONTACT;
            case PENDING -> link.requestedBy() == viewer
                    ? Relationship.OUTGOING_PENDING
                    : Relationship.INCOMING_PENDING;
            // The sender is not told about a decline: it keeps looking "requested" during the cooldown.
            case DECLINED -> link.requestedBy() == viewer && withinCooldown(link, now)
                    ? Relationship.OUTGOING_PENDING
                    : Relationship.NONE;
        };
    }

    /** What happens when `actor` asks to connect. */
    public static RequestAction onRequest(LinkState link, int actor, LocalDateTime now) {
        if (link == null) {
            return RequestAction.CREATE;
        }
        return switch (link.status()) {
            case ACCEPTED -> RequestAction.ALREADY_CONTACT;
            // They already asked us: asking back means yes.
            case PENDING -> link.requestedBy() == actor
                    ? RequestAction.ALREADY_PENDING
                    : RequestAction.AUTO_ACCEPT;
            case DECLINED -> link.requestedBy() == actor && withinCooldown(link, now)
                    ? RequestAction.ALREADY_PENDING
                    : RequestAction.RENEW;
        };
    }

    public static boolean canAccept(LinkState link, int actor) {
        return link != null && link.status() == ContactStatus.PENDING && link.requestedBy() != actor;
    }

    public static boolean canDecline(LinkState link, int actor) {
        return canAccept(link, actor);
    }

    public static boolean canCancel(LinkState link, int actor) {
        return link != null && link.status() == ContactStatus.PENDING && link.requestedBy() == actor;
    }

    public static boolean canRemove(LinkState link) {
        return link != null && link.status() == ContactStatus.ACCEPTED;
    }

    public static boolean areContacts(LinkState link) {
        return canRemove(link);
    }
}
