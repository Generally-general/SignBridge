package com.signbridge.project.dto;

import lombok.Data;

@Data
public class HistoryRequest {
    private String userId;
    private String translatedText;
    private String rawLandmarks;
}
