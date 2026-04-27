package com.signbridge.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalingMessage {
    private String type;
    private String senderId;
    private String receiverId;
    private Object data;
}
