package com.signbridge.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoryResponse {
    private Long id;
    private String userId;
    private String roomId;
    private String peerName;
    private String translatedText;
    private String source;
    private String speaker;
    private LocalDateTime timestamp;
}