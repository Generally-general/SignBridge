package com.signbridge.project.service;

import com.signbridge.project.dto.ContactRequestLists;
import com.signbridge.project.dto.ContactRequestView;
import com.signbridge.project.dto.ContactSummary;
import com.signbridge.project.dto.UserSearchResult;
import com.signbridge.project.entity.ContactLink;
import com.signbridge.project.entity.ContactStatus;
import com.signbridge.project.entity.User;
import com.signbridge.project.exception.BadRequestException;
import com.signbridge.project.exception.ConflictException;
import com.signbridge.project.exception.ResourceNotFoundException;
import com.signbridge.project.repository.ContactLinkRepository;
import com.signbridge.project.repository.UserRepository;
import com.signbridge.project.service.ContactRules.Relationship;
import com.signbridge.project.util.UsernamePolicy;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class ContactService {
    private static final int SEARCH_MIN_CHARS = 3;
    private static final int SEARCH_LIMIT = 10;
    private static final int MAX_PENDING_OUTGOING = 50;

    private final ContactLinkRepository links;
    private final UserRepository users;

    private static ContactRules.LinkState state(ContactLink link) {
        return link == null
                ? null
                : new ContactRules.LinkState(link.getStatus(), link.getRequestedBy(), link.getRespondedAt());
    }

    private Optional<ContactLink> find(int a, int b) {
        return links.findByUserLowIdAndUserHighId(ContactRules.low(a, b), ContactRules.high(a, b));
    }

    private Map<Integer, ContactLink> linksByOtherUser(int me) {
        Map<Integer, ContactLink> byOther = new HashMap<>();
        for (ContactLink link : links.findByUserLowIdOrUserHighId(me, me)) {
            int other = link.getUserLowId() == me ? link.getUserHighId() : link.getUserLowId();
            byOther.put(other, link);
        }
        return byOther;
    }

    private static String stripAt(String raw) {
        String s = UsernamePolicy.normalize(raw);
        return s.startsWith("@") ? s.substring(1) : s;
    }

    public boolean areContacts(int a, int b) {
        if (a == b) {
            return false;
        }
        return ContactRules.areContacts(state(find(a, b).orElse(null)));
    }

    /** Username search: 3+ characters, prefix match, max 10, never shows email or ids. */
    public List<UserSearchResult> search(User viewer, String rawQuery) {
        String q = stripAt(rawQuery);
        if (q.length() < SEARCH_MIN_CHARS || !q.matches("[a-z0-9_]+")) {
            return List.of();
        }
        String pattern = q.replace("\\", "\\\\").replace("_", "\\_") + "%";
        List<User> found = new ArrayList<>(
                users.searchByHandlePattern(pattern, viewer.getId(), PageRequest.of(0, SEARCH_LIMIT)));

        // Someone who hides from search can still be found by typing their full username.
        users.findByHandle(q)
                .filter(u -> !u.getId().equals(viewer.getId()))
                .ifPresent(exact -> {
                    found.removeIf(u -> u.getId().equals(exact.getId()));
                    found.add(0, exact);
                });

        LocalDateTime now = LocalDateTime.now();
        Map<Integer, ContactLink> byOther = linksByOtherUser(viewer.getId());
        return found.stream()
                .map(u -> new UserSearchResult(
                        u.getHandle(),
                        u.getFullName(),
                        ContactRules.relationship(state(byOther.get(u.getId())), viewer.getId(), now).name()))
                .collect(Collectors.toList());
    }

    public Relationship sendRequest(User actor, String rawUsername) {
        User target = users.findByHandle(stripAt(rawUsername))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (target.getId().equals(actor.getId())) {
            throw new BadRequestException("You cannot add yourself");
        }

        LocalDateTime now = LocalDateTime.now();
        ContactLink link = find(actor.getId(), target.getId()).orElse(null);

        switch (ContactRules.onRequest(state(link), actor.getId(), now)) {
            case CREATE -> {
                checkOutgoingLimit(actor.getId());
                link = links.save(ContactLink.builder()
                        .userLowId(ContactRules.low(actor.getId(), target.getId()))
                        .userHighId(ContactRules.high(actor.getId(), target.getId()))
                        .requestedBy(actor.getId())
                        .status(ContactStatus.PENDING)
                        .createdAt(now)
                        .build());
            }
            case RENEW -> {
                checkOutgoingLimit(actor.getId());
                link.setStatus(ContactStatus.PENDING);
                link.setRequestedBy(actor.getId());
                link.setCreatedAt(now);
                link.setRespondedAt(null);
                link = links.save(link);
            }
            case AUTO_ACCEPT -> {
                link.setStatus(ContactStatus.ACCEPTED);
                link.setRespondedAt(now);
                link = links.save(link);
            }
            case ALREADY_PENDING, ALREADY_CONTACT -> {
                // nothing to change: repeating a request is harmless
            }
        }
        return ContactRules.relationship(state(link), actor.getId(), now);
    }

    private void checkOutgoingLimit(int me) {
        long pending = links.findByUserLowIdOrUserHighId(me, me).stream()
                .filter(l -> l.getStatus() == ContactStatus.PENDING && l.getRequestedBy() == me)
                .count();
        if (pending >= MAX_PENDING_OUTGOING) {
            throw new BadRequestException("Too many pending requests. Wait for answers or cancel some.");
        }
    }

    public List<Integer> contactIdsOf(int userId) {
        return linksByOtherUser(userId).entrySet().stream()
                .filter(e -> ContactRules.areContacts(state(e.getValue())))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    public List<ContactSummary> listContacts(User viewer) {
        Map<Integer, ContactLink> byOther = linksByOtherUser(viewer.getId());
        List<Integer> contactIds = byOther.entrySet().stream()
                .filter(e -> ContactRules.areContacts(state(e.getValue())))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        return users.findAllById(contactIds).stream()
                .map(u -> new ContactSummary(u.getId(), u.getHandle(), u.getFullName()))
                .sorted(Comparator.comparing(c -> c.fullName() == null ? "" : c.fullName().toLowerCase()))
                .collect(Collectors.toList());
    }

    public ContactRequestLists listRequests(User viewer) {
        LocalDateTime now = LocalDateTime.now();
        Map<Integer, ContactLink> byOther = linksByOtherUser(viewer.getId());
        Map<Integer, User> people = users.findAllById(byOther.keySet()).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<ContactRequestView> incoming = new ArrayList<>();
        List<ContactRequestView> outgoing = new ArrayList<>();
        for (Map.Entry<Integer, ContactLink> e : byOther.entrySet()) {
            Relationship rel = ContactRules.relationship(state(e.getValue()), viewer.getId(), now);
            User other = people.get(e.getKey());
            if (other == null || (rel != Relationship.INCOMING_PENDING && rel != Relationship.OUTGOING_PENDING)) {
                continue;
            }
            ContactRequestView view = new ContactRequestView(
                    e.getValue().getId(), other.getHandle(), other.getFullName(), e.getValue().getCreatedAt());
            (rel == Relationship.INCOMING_PENDING ? incoming : outgoing).add(view);
        }
        Comparator<ContactRequestView> newestFirst = Comparator.comparing(ContactRequestView::createdAt).reversed();
        incoming.sort(newestFirst);
        outgoing.sort(newestFirst);
        return new ContactRequestLists(incoming, outgoing);
    }

    private ContactLink myLink(User actor, long linkId) {
        ContactLink link = links.findById(linkId).orElseThrow(() -> new ResourceNotFoundException("Request not found"));
        boolean mine = actor.getId().equals(link.getUserLowId()) || actor.getId().equals(link.getUserHighId());
        if (!mine) {
            throw new ResourceNotFoundException("Request not found"); // do not reveal that it exists
        }
        return link;
    }

    public void accept(User actor, long linkId) {
        ContactLink link = myLink(actor, linkId);
        if (!ContactRules.canAccept(state(link), actor.getId())) {
            throw new ConflictException("This request can no longer be accepted");
        }
        link.setStatus(ContactStatus.ACCEPTED);
        link.setRespondedAt(LocalDateTime.now());
        links.save(link);
    }

    public void decline(User actor, long linkId) {
        ContactLink link = myLink(actor, linkId);
        if (!ContactRules.canDecline(state(link), actor.getId())) {
            throw new ConflictException("This request can no longer be declined");
        }
        link.setStatus(ContactStatus.DECLINED);
        link.setRespondedAt(LocalDateTime.now());
        links.save(link);
    }

    public void cancel(User actor, long linkId) {
        ContactLink link = myLink(actor, linkId);
        if (!ContactRules.canCancel(state(link), actor.getId())) {
            throw new ConflictException("Only your own pending request can be cancelled");
        }
        links.delete(link);
    }

    public void removeContact(User actor, int otherUserId) {
        ContactLink link = find(actor.getId(), otherUserId)
                .filter(l -> ContactRules.canRemove(state(l)))
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
        links.delete(link);
    }
}
