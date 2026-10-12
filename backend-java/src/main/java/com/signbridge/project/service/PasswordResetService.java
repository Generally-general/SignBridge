package com.signbridge.project.service;

import com.signbridge.project.entity.PasswordResetToken;
import com.signbridge.project.entity.User;
import com.signbridge.project.exception.BadRequestException;
import com.signbridge.project.repository.PasswordResetTokenRepository;
import com.signbridge.project.repository.UserRepository;
import com.signbridge.project.util.PasswordPolicy;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
public class PasswordResetService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    static final Duration LIFETIME = Duration.ofMinutes(30);
    static final Duration COOLDOWN = Duration.ofSeconds(60);
    static final String INVALID_LINK = "This reset link is invalid or has expired. Please request a new one.";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final BCryptPasswordEncoder encoder;
    private final EmailService email;
    private final String frontendUrl;
    private final int dailyCap;

    // Resend's free plan allows 100 emails a day. This keeps a script from using them all up.
    private final ArrayDeque<LocalDateTime> sentToday = new ArrayDeque<>();

    public PasswordResetService(
            UserRepository users,
            PasswordResetTokenRepository tokens,
            BCryptPasswordEncoder encoder,
            EmailService email,
            @Value("${signbridge.frontend-url:http://localhost:5173}") String frontendUrl,
            @Value("${signbridge.mail.daily-cap:50}") int dailyCap) {
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.email = email;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.dailyCap = dailyCap;
    }

    /** Always completes quietly: the caller must not learn whether the address has an account. */
    @Transactional
    public void requestReset(String rawEmail) {
        String address = rawEmail == null ? "" : rawEmail.trim();
        if (address.isEmpty()) {
            return;
        }
        Optional<User> found = users.findByEmail(address);
        if (found.isEmpty()) {
            return;
        }
        User user = found.get();
        LocalDateTime now = now();

        Optional<PasswordResetToken> last = tokens.findFirstByUserIdOrderByCreatedAtDesc(user.getId());
        if (last.isPresent() && last.get().getCreatedAt().isAfter(now.minus(COOLDOWN))) {
            return;
        }
        if (!takeDailySlot(now)) {
            log.warn("Password reset email skipped: daily cap of {} reached", dailyCap);
            return;
        }

        tokens.deleteByExpiresAtBefore(now);
        tokens.deleteByUserId(user.getId());

        byte[] raw = new byte[32];
        RANDOM.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        PasswordResetToken row = new PasswordResetToken();
        row.setUserId(user.getId());
        row.setTokenHash(sha256(token));
        row.setCreatedAt(now);
        row.setExpiresAt(now.plus(LIFETIME));
        tokens.save(row);

        // The token sits after '#', so it is never sent to a server or written to a request log.
        String link = frontendUrl + "/reset-password#token=" + token;
        String name = user.getFullName();
        String to = user.getEmail();
        CompletableFuture.runAsync(() -> deliver(to, name, link));
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        String problem = PasswordPolicy.problem(newPassword);
        if (problem != null) {
            throw new BadRequestException(problem);
        }
        if (token == null || token.isBlank()) {
            throw new BadRequestException(INVALID_LINK);
        }
        PasswordResetToken row = tokens.findByTokenHash(sha256(token.trim()))
                .orElseThrow(() -> new BadRequestException(INVALID_LINK));
        if (row.getExpiresAt().isBefore(now())) {
            tokens.delete(row);
            throw new BadRequestException(INVALID_LINK);
        }
        User user = users.findById(row.getUserId()).orElseThrow(() -> new BadRequestException(INVALID_LINK));

        user.setPassword(encoder.encode(newPassword));
        user.setPasswordChangedAt(now());
        users.save(user);
        tokens.deleteByUserId(user.getId());
    }

    private void deliver(String to, String name, String link) {
        String subject = "Reset your SignBridge password";
        String text = "Hi " + name + ",\n\nUse this link to choose a new password (valid for 30 minutes):\n"
                + link + "\n\nIf you did not ask for this, you can ignore this email. Your password stays the same.";
        String html = "<p>Hi " + escape(name) + ",</p>"
                + "<p>Use the button below to choose a new password. The link works for 30 minutes.</p>"
                + "<p><a href=\"" + link + "\" style=\"background:#2563eb;color:#fff;padding:10px 18px;"
                + "border-radius:8px;text-decoration:none;font-weight:600\">Choose a new password</a></p>"
                + "<p>If the button does not work, copy this address into your browser:<br>" + link + "</p>"
                + "<p>If you did not ask for this, you can ignore this email. Your password stays the same.</p>";
        if (!email.isConfigured()) {
            // Local development only: no mail provider is set up, so show the link in the console.
            log.warn("Email is not configured (RESEND_API_KEY empty). Reset link for {}: {}", to, link);
            return;
        }
        if (!email.send(to, subject, html, text)) {
            log.error("Password reset email could not be delivered");
        }
    }

    private synchronized boolean takeDailySlot(LocalDateTime now) {
        LocalDateTime cutoff = now.minusHours(24);
        while (!sentToday.isEmpty() && sentToday.peekFirst().isBefore(cutoff)) {
            sentToday.pollFirst();
        }
        if (sentToday.size() >= dailyCap) {
            return false;
        }
        sentToday.addLast(now);
        return true;
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}