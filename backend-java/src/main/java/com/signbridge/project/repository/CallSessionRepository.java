package com.signbridge.project.repository;

import com.signbridge.project.entity.CallSession;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;

public interface CallSessionRepository extends JpaRepository<CallSession, Long> {
    Optional<CallSession> findByRoomId(String roomId);

    @Query("select c from CallSession c where (c.callerId = :userId or c.receiverId = :userId) "
            + "and c.createdAt > :since order by c.id desc")
    List<CallSession> findNewest(
            @Param("userId") Integer userId, @Param("since") LocalDateTime since, Pageable pageable);

    @Query("select c from CallSession c where (c.callerId = :userId or c.receiverId = :userId) "
            + "and c.id < :beforeId and c.createdAt > :since order by c.id desc")
    List<CallSession> findOlderThan(
            @Param("userId") Integer userId,
            @Param("beforeId") Long beforeId,
            @Param("since") LocalDateTime since,
            Pageable pageable);

    List<CallSession> findTop50ByCallerIdOrReceiverIdOrderByCreatedAtDesc(
            Integer callerId, Integer receiverId);
}