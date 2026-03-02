package com.signbridge.project.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "gesture_history")
@Data
public class GestureHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    private String userId;
    private String translatedText;
    private LocalDateTime timestamp;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String rawLandmarks;
}
