package com.signbridge.project.dto;

public record PushSubscribeRequest(String endpoint, String p256dh, String auth) {
}