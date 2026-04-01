package com.signbridge.project.service;

import com.signbridge.project.dto.HistoryRequest;
import com.signbridge.project.dto.HistoryResponse;
import com.signbridge.project.entity.GestureHistory;
import com.signbridge.project.repository.GestureHistoryRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class HistoryService {
    private final GestureHistoryRepository historyRepository;

    public void saveGesture(HistoryRequest request) {
        GestureHistory entity = GestureHistory.builder()
                .userId(request.getUserId())
                .translatedText(request.getTranslatedText())
                .rawLandmarks(request.getRawLandmarks())
                .timestamp(LocalDateTime.now())
                .build();

        historyRepository.save(entity);
    }

    public List<HistoryResponse> getUserHistory(String userId) {
        return historyRepository.findByUserIdOrderByTimestampDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public HistoryResponse toResponse(GestureHistory entity) {
        return HistoryResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .translatedText(entity.getTranslatedText())
                .timestamp(entity.getTimestamp())
                .build();
    }
}
