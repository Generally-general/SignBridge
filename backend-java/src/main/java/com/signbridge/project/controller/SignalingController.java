package com.signbridge.project.controller;

import com.signbridge.project.dto.SignalingMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class SignalingController {
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/call/signal")
    public void handleSignaling(@Payload SignalingMessage message) {
        messagingTemplate.convertAndSendToUser(
                message.getReceiverId(),
                "/queue/call",
                message
        );
    }
}
