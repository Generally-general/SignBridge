package com.signbridge.project.service;

import com.signbridge.project.dto.HistoryRequest;
import com.signbridge.project.dto.HistoryResponse;
import com.signbridge.project.entity.GestureHistory;
import com.signbridge.project.repository.GestureHistoryRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class HistoryService {
    private final GestureHistoryRepository historyRepository;

    private static final Set<String> SOURCES = Set.of("SIGN", "SPEECH");
    private static final Set<String> SPEAKERS = Set.of("ME", "THEM");
    private static final int MAX_ROOMS_PER_REQUEST = 50;
    private static final int MAX_RECENT_LINES = 200;

    private static String allowed(String value, Set<String> allowedValues) {
        return value != null && allowedValues.contains(value) ? value : null;
    }

    public void saveGesture(HistoryRequest request) {
        GestureHistory entity = GestureHistory.builder()
                .userId(request.getUserId())
                .roomId(request.getRoomId())
                .peerName(request.getPeerName())
                .translatedText(request.getTranslatedText())
                .source(allowed(request.getSource(), SOURCES))
                .speaker(allowed(request.getSpeaker(), SPEAKERS))
                .rawLandmarks(request.getRawLandmarks())
                .timestamp(LocalDateTime.now())
                .build();

        historyRepository.save(entity);
    }

    public void clearUserHistory(String userId) {
        historyRepository.deleteByUserId(userId);
    }

    public List<HistoryResponse> getUserHistory(String userId) {
        return historyRepository.findRecentLines(userId, PageRequest.of(0, MAX_RECENT_LINES));
    }

    /** The saved lines of specific calls, oldest first. The History tab asks for a page of calls at a time. */
    public List<HistoryResponse> getLinesForRooms(String userId, Collection<String> roomIds) {
        if (roomIds == null) {
            return List.of();
        }
        List<String> cleaned = roomIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isEmpty())
                .distinct()
                .limit(MAX_ROOMS_PER_REQUEST)
                .collect(Collectors.toList());
        if (cleaned.isEmpty()) {
            return List.of();
        }
        return historyRepository.findLinesForRooms(userId, cleaned);
    }

    public HistoryResponse toResponse(GestureHistory entity) {
        return HistoryResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .roomId(entity.getRoomId())
                .peerName(entity.getPeerName())
                .translatedText(entity.getTranslatedText())
                .source(entity.getSource())
                .speaker(entity.getSpeaker())
                .timestamp(entity.getTimestamp())
                .build();
    }
}
