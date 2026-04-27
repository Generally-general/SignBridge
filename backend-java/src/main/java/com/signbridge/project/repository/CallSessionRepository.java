package com.signbridge.project.repository;

import com.signbridge.project.entity.CallSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallSessionRepository extends JpaRepository<CallSession, Long> {
}
