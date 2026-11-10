package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.PushSubscribeRequest;
import com.signbridge.project.entity.PushSubscription;
import com.signbridge.project.entity.User;
import com.signbridge.project.repository.PushSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {
    private final PushSubscriptionRepository subscriptions;

    @PostMapping("/subscriptions")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> subscribe(
            @AuthenticationPrincipal User me, @RequestBody PushSubscribeRequest body) {
        if (body.endpoint() == null || body.endpoint().length() > 500
                || body.p256dh() == null || body.p256dh().length() > 255
                || body.auth() == null || body.auth().length() > 255) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Invalid subscription", null));
        }
        // The same browser can be used by another account later: the endpoint moves to the new owner.
        PushSubscription sub = subscriptions.findByEndpoint(body.endpoint()).orElseGet(PushSubscription::new);
        sub.setUserId(me.getId());
        sub.setEndpoint(body.endpoint());
        sub.setP256dh(body.p256dh());
        sub.setAuth(body.auth());
        if (sub.getCreatedAt() == null) sub.setCreatedAt(LocalDateTime.now());
        subscriptions.save(sub);
        return ResponseEntity.ok(new ApiResponse<>(true, "Subscribed", null));
    }

    @DeleteMapping("/subscriptions")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> unsubscribe(
            @AuthenticationPrincipal User me, @RequestParam String endpoint) {
        subscriptions.findByEndpoint(endpoint)
                .filter(s -> s.getUserId().equals(me.getId()))
                .ifPresent(subscriptions::delete);
        return ResponseEntity.ok(new ApiResponse<>(true, "Unsubscribed", null));
    }
}