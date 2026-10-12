package com.signbridge.project.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "contact_cards")
@Getter
@Setter
@NoArgsConstructor
public class ContactCard {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer userId;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(nullable = false, length = 20)
    private String badge;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    /** Null = never expires. */
    private LocalDateTime expiresAt;

    /** Null = unlimited. */
    private Integer maxUses;

    @Column(nullable = false)
    private int uses;
}