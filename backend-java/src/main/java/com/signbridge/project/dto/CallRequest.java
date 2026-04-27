package com.signbridge.project.dto;

import lombok.Data;

@Data
public class CallRequest {
    private Integer receiverId;
    private String type;
    private String sdp;
}
