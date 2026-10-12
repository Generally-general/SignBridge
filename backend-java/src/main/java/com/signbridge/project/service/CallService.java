package com.signbridge.project.service;

import com.signbridge.project.dto.CallRequest;
import com.signbridge.project.dto.CallResponse;
import com.signbridge.project.entity.CallSession;
import com.signbridge.project.entity.CallStatus;
import com.signbridge.project.entity.User;
import com.signbridge.project.exception.BadRequestException;
import com.signbridge.project.exception.ConflictException;
import com.signbridge.project.exception.ForbiddenException;
import com.signbridge.project.exception.ResourceNotFoundException;
import com.signbridge.project.repository.CallSessionRepository;
import com.signbridge.project.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class CallService {
    private static final int DEFAULT_PAGE = 20;
    private static final int MAX_PAGE = 50;
    private static final LocalDateTime EPOCH = LocalDateTime.of(1970, 1, 1, 0, 0);
    private static final Pattern ROOM_ID = Pattern.compile("^[A-Za-z0-9_-]{1,100}$");

    private final CallSessionRepository callRepository;
    private final UserRepository userRepository;
    private final ContactService contactService;

    public CallResponse createCall(User caller, CallRequest request) {
        if (request.getReceiverId() == null) {
            throw new BadRequestException("receiverId is required");
        }
        if (request.getRoomId() == null || !ROOM_ID.matcher(request.getRoomId()).matches()) {
            throw new BadRequestException("roomId is invalid");
        }
        if (request.getReceiverId().equals(caller.getId())) {
            throw new BadRequestException("You cannot call yourself");
        }
        if (!contactService.areContacts(caller.getId(), request.getReceiverId())) {
            throw new ForbiddenException("You can only call your contacts");
        }
        if (callRepository.findByRoomId(request.getRoomId()).isPresent()) {
            throw new ConflictException("Room already in use");
        }

        CallSession saved = callRepository.save(CallSession.builder()
                .roomId(request.getRoomId())
                .callerId(caller.getId())
                .receiverId(request.getReceiverId())
                .status(CallStatus.RINGING)
                .createdAt(LocalDateTime.now())
                .build());

        log.info("created room={} caller={} receiver={}",
                saved.getRoomId(), saved.getCallerId(), saved.getReceiverId());
        return toResponse(saved, loadNames(List.of(saved)));
    }

    public CallResponse acceptCall(User user, String roomId) {
        CallSession call = findForParticipant(user, roomId);
        log.info("accept room={} by user={} currentStatus={}", roomId, user.getId(), call.getStatus());

        if (!call.getReceiverId().equals(user.getId())) {
            throw new ForbiddenException("Only the receiver can accept a call");
        }
        if (call.getStatus() == CallStatus.ACCEPTED) {
            return toResponse(call, loadNames(List.of(call))); // idempotent
        }
        if (call.getStatus() != CallStatus.RINGING) {
            throw new ConflictException("Call is no longer ringing");
        }

        call.setStatus(CallStatus.ACCEPTED);
        call.setStartTime(LocalDateTime.now());
        return toResponse(callRepository.save(call), loadNames(List.of(call)));
    }

    public CallResponse endCall(User user, String roomId) {
        CallSession call = findForParticipant(user, roomId);
        log.info("end room={} by user={} currentStatus={}", roomId, user.getId(), call.getStatus());

        switch (call.getStatus()) {
            case RINGING -> {
                boolean callerHangingUp = call.getCallerId().equals(user.getId());
                call.setStatus(callerHangingUp ? CallStatus.CANCELLED : CallStatus.REJECTED);
                call.setEndTime(LocalDateTime.now());
            }
            case ACCEPTED -> {
                call.setStatus(CallStatus.ENDED);
                call.setEndTime(LocalDateTime.now());
            }
            default -> { } // already terminal: idempotent, leave untouched
        }
        return toResponse(callRepository.save(call), loadNames(List.of(call)));
    }

    public void systemClose(String roomId) {
        callRepository.findByRoomId(roomId).ifPresent(call -> {
            switch (call.getStatus()) {
                case RINGING -> {
                    call.setStatus(CallStatus.CANCELLED);
                    call.setEndTime(LocalDateTime.now());
                }
                case ACCEPTED -> {
                    call.setStatus(CallStatus.ENDED);
                    call.setEndTime(LocalDateTime.now());
                }
                default -> { }
            }
            callRepository.save(call);
            log.info("system close room={} -> {}", roomId, call.getStatus());
        });
    }

    public List<CallResponse> getMyCalls(User user) {
        return getMyCalls(user, DEFAULT_PAGE, null);
    }

    public List<CallResponse> getMyCalls(User user, int limit, Long beforeId) {
        int size = limit <= 0 ? DEFAULT_PAGE : Math.min(limit, MAX_PAGE);
        Pageable page = PageRequest.of(0, size);
        LocalDateTime since = user.getCallsClearedAt() != null ? user.getCallsClearedAt() : EPOCH;
        List<CallSession> calls = beforeId == null
                ? callRepository.findNewest(user.getId(), since, page)
                : callRepository.findOlderThan(user.getId(), beforeId, since, page);
        Map<Integer, String> names = loadNames(calls);
        return calls.stream().map(c -> toResponse(c, names)).collect(Collectors.toList());
    }

    public void clearMyCalls(Integer userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setCallsClearedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    private CallSession findForParticipant(User user, String roomId) {
        CallSession call = callRepository.findByRoomId(roomId)
                .orElseThrow(() -> {
                    log.warn("call lookup failed room={} user={}", roomId, user.getId());
                    return new ResourceNotFoundException("Call not found");
                });
        boolean participant = user.getId().equals(call.getCallerId())
                || user.getId().equals(call.getReceiverId());
        if (!participant) {
            throw new ForbiddenException("You are not a participant in this call");
        }
        return call;
    }

    private Map<Integer, String> loadNames(Collection<CallSession> calls) {
        Set<Integer> ids = new HashSet<>();
        for (CallSession c : calls) {
            ids.add(c.getCallerId());
            ids.add(c.getReceiverId());
        }
        Map<Integer, String> names = new HashMap<>();
        userRepository.findAllById(ids).forEach(u -> names.put(u.getId(), u.getFullName()));
        return names;
    }

    private CallResponse toResponse(CallSession c, Map<Integer, String> names) {
        Long duration = (c.getStartTime() != null && c.getEndTime() != null)
                ? Duration.between(c.getStartTime(), c.getEndTime()).getSeconds()
                : null;
        return CallResponse.builder()
                .id(c.getId())
                .roomId(c.getRoomId())
                .callerId(c.getCallerId())
                .callerName(names.get(c.getCallerId()))
                .receiverId(c.getReceiverId())
                .receiverName(names.get(c.getReceiverId()))
                .status(c.getStatus())
                .createdAt(c.getCreatedAt())
                .startTime(c.getStartTime())
                .endTime(c.getEndTime())
                .durationSeconds(duration)
                .build();
    }
}