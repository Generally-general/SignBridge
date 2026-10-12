package com.signbridge.project.service;

import com.signbridge.project.dto.CardPreview;
import com.signbridge.project.dto.CardSaveRequest;
import com.signbridge.project.dto.CardView;
import com.signbridge.project.entity.ContactCard;
import com.signbridge.project.entity.User;
import com.signbridge.project.exception.BadRequestException;
import com.signbridge.project.exception.ResourceNotFoundException;
import com.signbridge.project.repository.ContactCardRepository;
import com.signbridge.project.repository.UserRepository;
import com.signbridge.project.service.ContactRules.Relationship;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
public class ContactCardService {
    static final String INVALID = "This card is no longer valid";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ContactCardRepository cards;
    private final UserRepository users;
    private final ContactService contacts;

    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private static String newToken() {
        byte[] raw = new byte[16];
        RANDOM.nextBytes(raw);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }

    private static CardView view(ContactCard c) {
        return new CardView(c.getToken(), c.getBadge(), c.getColor(), c.getExpiresAt(), c.getMaxUses(), c.getUses());
    }

    public Optional<CardView> mine(User me) {
        return cards.findByUserId(me.getId()).map(ContactCardService::view);
    }

    public CardView save(User me, CardSaveRequest req) {
        LocalDateTime now = now();
        ContactCard card = cards.findByUserId(me.getId()).orElse(null);
        boolean fresh = card == null;
        boolean regenerate = fresh || Boolean.TRUE.equals(req.regenerate());

        String badge = CardPolicy.badge(req.badge(), fresh ? null : card.getBadge());
        String color = CardPolicy.color(req.color(), fresh ? null : card.getColor());

        // Validate everything before changing anything.
        LocalDateTime expiresAt = null;
        boolean setExpiry = req.expiry() != null || regenerate;
        if (setExpiry) {
            expiresAt = CardPolicy.expiryFrom(req.expiry() == null ? CardPolicy.DEFAULT_EXPIRY : req.expiry(), now);
        }
        Integer maxUses = null;
        boolean setMaxUses = req.maxUses() != null;
        if (setMaxUses) {
            maxUses = CardPolicy.maxUses(req.maxUses());
        }

        if (fresh) {
            card = new ContactCard();
            card.setUserId(me.getId());
            card.setCreatedAt(now);
        }
        if (regenerate) {
            card.setToken(newToken());
            card.setUses(0);
            if (!setMaxUses) {
                card.setMaxUses(null);
            }
        }
        card.setBadge(badge);
        card.setColor(color);
        if (setExpiry) {
            card.setExpiresAt(expiresAt);
        }
        if (setMaxUses) {
            card.setMaxUses(maxUses);
        }
        return view(cards.save(card));
    }

    public void turnOff(User me) {
        cards.deleteByUserId(me.getId());
    }

    /** Public. A dead link looks the same whatever the reason. */
    public CardPreview preview(String token) {
        ContactCard card = usable(token);
        User owner = users.findById(card.getUserId()).orElseThrow(() -> new ResourceNotFoundException(INVALID));
        return new CardPreview(owner.getFullName(), card.getBadge(), card.getColor());
    }

    /** An ordinary contact request; the owner still has to accept. */
    public Relationship connect(User visitor, String token) {
        ContactCard card = usable(token);
        User owner = users.findById(card.getUserId()).orElseThrow(() -> new ResourceNotFoundException(INVALID));
        if (owner.getId().equals(visitor.getId())) {
            throw new BadRequestException("This is your own card");
        }
        Relationship result = contacts.sendRequest(visitor, owner.getHandle());
        card.setUses(card.getUses() + 1);
        cards.save(card);
        return result;
    }

    private ContactCard usable(String token) {
        if (token == null || token.isBlank() || token.length() > 64) {
            throw new ResourceNotFoundException(INVALID);
        }
        ContactCard card = cards.findByToken(token.trim()).orElse(null);
        if (!CardPolicy.isUsable(card, now())) {
            throw new ResourceNotFoundException(INVALID);
        }
        return card;
    }
}