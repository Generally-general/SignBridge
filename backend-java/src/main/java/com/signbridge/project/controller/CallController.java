package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.CallRequest;
import com.signbridge.project.dto.CallResponse;
import com.signbridge.project.entity.User;
import com.signbridge.project.service.CallService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.signbridge.project.service.HistoryService;

import java.util.List;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {
    private final CallService callService;
    private final HistoryService historyService;

    @PostMapping
    public ResponseEntity<ApiResponse<CallResponse>> create(
            @AuthenticationPrincipal User user, @RequestBody CallRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Call created", callService.createCall(user, request)));
    }

    @PostMapping("/{roomId}/accept")
    public ResponseEntity<ApiResponse<CallResponse>> accept(
            @AuthenticationPrincipal User user, @PathVariable String roomId) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Call accepted", callService.acceptCall(user, roomId)));
    }

    @PostMapping("/{roomId}/end")
    public ResponseEntity<ApiResponse<CallResponse>> end(
            @AuthenticationPrincipal User user, @PathVariable String roomId) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Call ended", callService.endCall(user, roomId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearMine(@AuthenticationPrincipal User user) {
        callService.clearMyCalls(user.getId());
        historyService.clearUserHistory(String.valueOf(user.getId()));
        return ResponseEntity.ok(new ApiResponse<>(true, "History cleared", null));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CallResponse>>> myCalls(
            @AuthenticationPrincipal User user,
            @RequestParam(name = "limit", defaultValue = "20") int limit,
            @RequestParam(name = "beforeId", required = false) Long beforeId) {
        return ResponseEntity.ok(
                new ApiResponse<>(true, "Calls fetched", callService.getMyCalls(user, limit, beforeId)));
    }
}