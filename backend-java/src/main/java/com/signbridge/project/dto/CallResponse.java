package com.signbridge.project.dto;

import com.signbridge.project.entity.CallStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CallResponse {
    private Long id;
    private String roomId;
    private Integer callerId;
    private String callerName;
    private Integer receiverId;
    private String receiverName;
    private CallStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long durationSeconds;
}