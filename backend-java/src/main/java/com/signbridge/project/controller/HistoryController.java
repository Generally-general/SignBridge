package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.HistoryRequest;
import com.signbridge.project.dto.HistoryResponse;
import com.signbridge.project.service.HistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@CrossOrigin
@RequiredArgsConstructor
public class HistoryController {
    private final HistoryService historyService;

    @PostMapping("/save")
    public ResponseEntity<ApiResponse<Void>> saveHistory(@RequestBody HistoryRequest request) {
        historyService.saveGesture(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Gesture history saved to SSMS.", null));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<HistoryResponse>>> getUserHistory(@PathVariable String userId) {
        List<HistoryResponse> history = historyService.getUserHistory(userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "User History Fetched", history));
    }
}
