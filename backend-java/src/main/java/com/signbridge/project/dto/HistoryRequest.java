package com.signbridge.project.dto;

import lombok.Data;

@Data
public class HistoryRequest {
    private String userId;
    private String roomId;
    private String peerName;
    private String translatedText;
    private String rawLandmarks;
    private String source;
    private String speaker;
}