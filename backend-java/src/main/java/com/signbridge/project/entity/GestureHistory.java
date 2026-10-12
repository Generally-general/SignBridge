package com.signbridge.project.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "gesture_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GestureHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;
    private String roomId;
    private String peerName;
    private String translatedText;
    private String source;
    private String speaker;
    private LocalDateTime timestamp;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String rawLandmarks;
}
