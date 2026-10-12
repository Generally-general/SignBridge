package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.CardPreview;
import com.signbridge.project.dto.CardSaveRequest;
import com.signbridge.project.dto.CardView;
import com.signbridge.project.dto.RelationshipResponse;
import com.signbridge.project.entity.User;
import com.signbridge.project.service.ContactCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CardController {
    private final ContactCardService cards;

    /** Public: it sits under /api/auth/**, which is already open. */
    @GetMapping("/auth/cards/{token}")
    public ResponseEntity<ApiResponse<CardPreview>> preview(@PathVariable String token) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Card found", cards.preview(token)));
    }

    @GetMapping("/cards/me")
    public ResponseEntity<ApiResponse<CardView>> mine(@AuthenticationPrincipal User me) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Card fetched", cards.mine(me).orElse(null)));
    }

    @PutMapping("/cards/me")
    public ResponseEntity<ApiResponse<CardView>> save(
            @AuthenticationPrincipal User me, @RequestBody CardSaveRequest body) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Card saved", cards.save(me, body)));
    }

    @DeleteMapping("/cards/me")
    public ResponseEntity<ApiResponse<Void>> turnOff(@AuthenticationPrincipal User me) {
        cards.turnOff(me);
        return ResponseEntity.ok(new ApiResponse<>(true, "Card turned off", null));
    }

    @PostMapping("/cards/{token}/connect")
    public ResponseEntity<ApiResponse<RelationshipResponse>> connect(
            @AuthenticationPrincipal User me, @PathVariable String token) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Request processed",
                new RelationshipResponse(cards.connect(me, token).name())));
    }
}