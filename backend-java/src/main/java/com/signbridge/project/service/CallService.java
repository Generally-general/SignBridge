package com.signbridge.project.service;

import com.signbridge.project.dto.CallRequest;
import com.signbridge.project.entity.CallSession;
import com.signbridge.project.repository.CallSessionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class CallService {
    private final CallSessionRepository callSessionRepository;

    public void initiateCall(Integer callerId, CallRequest request) {
        CallSession session = CallSession.builder()
                .callerId(callerId)
                .receiverId(request.getReceiverId())
                .status("INITIATED")
                .startTime(LocalDateTime.now())
                .build();

        callSessionRepository.save(session);
    }
}
