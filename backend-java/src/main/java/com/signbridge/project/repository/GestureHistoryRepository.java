package com.signbridge.project.repository;

import com.signbridge.project.entity.GestureHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GestureHistoryRepository extends JpaRepository<GestureHistory, Integer> {
    List<GestureHistory> findByUserIdOrderByTimestampDesc(String userId);
}
