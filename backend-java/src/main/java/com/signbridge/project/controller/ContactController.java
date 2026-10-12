package com.signbridge.project.controller;

import com.signbridge.project.dto.ApiResponse;
import com.signbridge.project.dto.ContactRequestLists;
import com.signbridge.project.dto.ContactSummary;
import com.signbridge.project.dto.RelationshipResponse;
import com.signbridge.project.dto.SendRequestBody;
import com.signbridge.project.entity.User;
import com.signbridge.project.service.ContactRules.Relationship;
import com.signbridge.project.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {
    private final ContactService contactService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ContactSummary>>> contacts(@AuthenticationPrincipal User me) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Contacts fetched", contactService.listContacts(me)));
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<ContactRequestLists>> requests(@AuthenticationPrincipal User me) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Requests fetched", contactService.listRequests(me)));
    }

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<RelationshipResponse>> send(
            @AuthenticationPrincipal User me, @RequestBody SendRequestBody body) {
        Relationship result = contactService.sendRequest(me, body.username());
        return ResponseEntity.ok(new ApiResponse<>(true, "Request processed", new RelationshipResponse(result.name())));
    }

    @PostMapping("/requests/{id}/accept")
    public ResponseEntity<ApiResponse<Void>> accept(@AuthenticationPrincipal User me, @PathVariable long id) {
        contactService.accept(me, id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Request accepted", null));
    }

    @PostMapping("/requests/{id}/decline")
    public ResponseEntity<ApiResponse<Void>> decline(@AuthenticationPrincipal User me, @PathVariable long id) {
        contactService.decline(me, id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Request declined", null));
    }

    @DeleteMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<Void>> cancel(@AuthenticationPrincipal User me, @PathVariable long id) {
        contactService.cancel(me, id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Request cancelled", null));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> remove(@AuthenticationPrincipal User me, @PathVariable int userId) {
        contactService.removeContact(me, userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Contact removed", null));
    }
}
