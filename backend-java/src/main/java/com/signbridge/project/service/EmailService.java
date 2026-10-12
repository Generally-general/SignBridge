package com.signbridge.project.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Sends mail through Brevo's HTTPS API (port 443). SMTP is not used on purpose: Render's free
 * web services block outbound SMTP ports 25, 465 and 587. With no API key configured nothing is sent.
 */
@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final URI endpoint;
    private final String apiKey;
    private final String fromEmail;
    private final String fromName;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper mapper = new ObjectMapper();

    public EmailService(
            @Value("${signbridge.mail.api-key:}") String apiKey,
            @Value("${signbridge.mail.from:}") String fromEmail,
            @Value("${signbridge.mail.from-name:SignBridge}") String fromName,
            @Value("${signbridge.mail.endpoint:https://api.brevo.com/v3/smtp/email}") String endpoint) {
        this.endpoint = URI.create(endpoint);
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.fromEmail = fromEmail == null ? "" : fromEmail.trim();
        this.fromName = fromName;
    }

    /** Needs both the API key and a sender address that has been verified in Brevo. */
    public boolean isConfigured() {
        return !apiKey.isEmpty() && !fromEmail.isEmpty();
    }

    /** Returns true when the provider accepted the message. Never throws. */
    public boolean send(String to, String subject, String html, String text) {
        if (!isConfigured()) {
            return false;
        }
        try {
            String body = mapper.writeValueAsString(Map.of(
                    "sender", Map.of("name", fromName, "email", fromEmail),
                    "to", List.of(Map.of("email", to)),
                    "subject", subject,
                    "htmlContent", html,
                    "textContent", text));
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(15))
                    .header("api-key", apiKey)
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .header("User-Agent", "signbridge-backend")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 == 2) {
                return true;
            }
            log.error("Email provider rejected the message: HTTP {} {}", response.statusCode(), response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Email sending was interrupted");
        } catch (Exception e) {
            log.error("Email sending failed: {}", e.getMessage());
        }
        return false;
    }
}