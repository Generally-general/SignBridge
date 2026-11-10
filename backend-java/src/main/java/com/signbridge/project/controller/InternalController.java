package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.ContactCheckResponse;
import com.signbridge.project.dto.ContactIdsResponse;
import com.signbridge.project.exception.ForbiddenException;
import com.signbridge.project.service.CallService;
import com.signbridge.project.service.ContactService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.transaction.Transactional;
import com.signbridge.project.repository.PushSubscriptionRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Server-to-server endpoints (the signaling server asks "may these two people call each other?",
 * "who are this person's contacts?" and says "this call is over").
 * Protected by a shared key, not by a user login. With no key configured it is switched off.
 */
@RestController
@RequestMapping("/api/internal")
public class InternalController {
    private final PushSubscriptionRepository pushSubscriptions;
    private final ContactService contactService;
    private final CallService callService;
    private final byte[] expectedKey;

    public InternalController(
            PushSubscriptionRepository pushSubscriptions,
            ContactService contactService,
            CallService callService,
            @Value("${signbridge.internal-api-key:}") String internalApiKey) {
        this.contactService = contactService;
        this.callService = callService;
        this.pushSubscriptions = pushSubscriptions;
        this.expectedKey = internalApiKey.getBytes(StandardCharsets.UTF_8);
    }

    private void requireKey(String providedKey) {
        boolean allowed = expectedKey.length > 0
                && providedKey != null
                && MessageDigest.isEqual(expectedKey, providedKey.getBytes(StandardCharsets.UTF_8));
        if (!allowed) {
            throw new ForbiddenException("Forbidden");
        }
    }

    @GetMapping("/contacts/check")
    public ResponseEntity<ApiResponse<ContactCheckResponse>> check(
            @RequestHeader(value = "X-Internal-Key", required = false) String providedKey,
            @RequestParam Integer a,
            @RequestParam Integer b) {
        requireKey(providedKey);
        return ResponseEntity.ok(
                new ApiResponse<>(true, "ok", new ContactCheckResponse(contactService.areContacts(a, b))));
    }

    @GetMapping("/contacts/of")
    public ResponseEntity<ApiResponse<ContactIdsResponse>> contactsOf(
            @RequestHeader(value = "X-Internal-Key", required = false) String providedKey,
            @RequestParam(name = "u") Integer userId) {
        requireKey(providedKey);
        return ResponseEntity.ok(
                new ApiResponse<>(true, "ok", new ContactIdsResponse(contactService.contactIdsOf(userId))));
    }

    @PostMapping("/calls/{roomId}/close")
    public ResponseEntity<ApiResponse<Void>> closeCall(
            @RequestHeader(value = "X-Internal-Key", required = false) String providedKey,
            @PathVariable String roomId) {
        requireKey(providedKey);
        callService.systemClose(roomId);
        return ResponseEntity.ok(new ApiResponse<>(true, "ok", null));
    }

    public record PushSub(String endpoint, String p256dh, String auth) {
    }

    @GetMapping("/push/{userId}")
    public ResponseEntity<ApiResponse<List<PushSub>>> pushOf(
            @RequestHeader(value = "X-Internal-Key", required = false) String providedKey,
            @PathVariable Integer userId) {
        requireKey(providedKey);
        List<PushSub> subs = pushSubscriptions.findByUserId(userId).stream()
                .map(s -> new PushSub(s.getEndpoint(), s.getP256dh(), s.getAuth()))
                .toList();
        return ResponseEntity.ok(new ApiResponse<>(true, "ok", subs));
    }

    @DeleteMapping("/push")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> dropPush(
            @RequestHeader(value = "X-Internal-Key", required = false) String providedKey,
            @RequestParam String endpoint) {
        requireKey(providedKey);
        pushSubscriptions.deleteByEndpoint(endpoint);
        return ResponseEntity.ok(new ApiResponse<>(true, "ok", null));
    }
}