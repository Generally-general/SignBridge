package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.HistoryRequest;
import com.signbridge.project.dto.HistoryResponse;
import com.signbridge.project.entity.User;
import com.signbridge.project.exception.ForbiddenException;
import com.signbridge.project.service.HistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@CrossOrigin
@RequiredArgsConstructor
public class HistoryController {
    private final HistoryService historyService;

    private void requireSelf(User user, String userId) {
        if (user == null || userId == null || !String.valueOf(user.getId()).equals(userId)) {
            throw new ForbiddenException("You can only access your own history");
        }
    }

    @PostMapping("/save")
    public ResponseEntity<ApiResponse<Void>> saveHistory(
            @AuthenticationPrincipal User user, @RequestBody HistoryRequest request) {
        requireSelf(user, request.getUserId());
        historyService.saveGesture(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Gesture history saved to SSMS.", null));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<HistoryResponse>>> getUserHistory(
            @AuthenticationPrincipal User user, @PathVariable String userId) {
        requireSelf(user, userId);
        List<HistoryResponse> history = historyService.getUserHistory(userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "User History Fetched", history));
    }

    @GetMapping("/user/{userId}/rooms")
    public ResponseEntity<ApiResponse<List<HistoryResponse>>> getLinesForRooms(
            @AuthenticationPrincipal User user,
            @PathVariable String userId,
            @RequestParam(name = "ids") List<String> roomIds) {
        requireSelf(user, userId);
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Lines fetched", historyService.getLinesForRooms(userId, roomIds)));
    }

    @DeleteMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<Void>> clearUserHistory(
            @AuthenticationPrincipal User user, @PathVariable String userId) {
        requireSelf(user, userId);
        historyService.clearUserHistory(userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "History cleared", null));
    }
}