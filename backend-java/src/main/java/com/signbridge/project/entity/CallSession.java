package com.signbridge.project.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 100)
    private String roomId;

    private Integer callerId;
    private Integer receiverId;

    @Enumerated(EnumType.STRING)
    private CallStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
