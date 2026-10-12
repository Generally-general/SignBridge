package com.signbridge.project.repository;

import com.signbridge.project.dto.HistoryResponse;
import com.signbridge.project.entity.GestureHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface GestureHistoryRepository extends JpaRepository<GestureHistory, Integer> {

    void deleteByUserId(String userId);

    // Both queries read only the columns the screen needs. The raw landmark text column
    // (NVARCHAR(MAX)) is never loaded: it is large and nothing displays it.
    @Query("select new com.signbridge.project.dto.HistoryResponse("
            + "h.id, h.userId, h.roomId, h.peerName, h.translatedText, h.source, h.speaker, h.timestamp) "
            + "from GestureHistory h where h.userId = :userId order by h.timestamp desc, h.id desc")
    List<HistoryResponse> findRecentLines(@Param("userId") String userId, Pageable pageable);

    @Query("select new com.signbridge.project.dto.HistoryResponse("
            + "h.id, h.userId, h.roomId, h.peerName, h.translatedText, h.source, h.speaker, h.timestamp) "
            + "from GestureHistory h where h.userId = :userId and h.roomId in :roomIds "
            + "order by h.timestamp asc, h.id asc")
    List<HistoryResponse> findLinesForRooms(
            @Param("userId") String userId, @Param("roomIds") Collection<String> roomIds);
}