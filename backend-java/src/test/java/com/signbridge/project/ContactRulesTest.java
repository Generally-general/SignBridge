package com.signbridge.project;

import com.signbridge.project.entity.ContactStatus;
import com.signbridge.project.service.ContactRules;
import com.signbridge.project.service.ContactRules.LinkState;
import com.signbridge.project.service.ContactRules.Relationship;
import com.signbridge.project.service.ContactRules.RequestAction;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class ContactRulesTest {
    static final int ME = 1, YOU = 2;
    static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 10, 12, 0);

    static LinkState link(ContactStatus s, int by, LocalDateTime responded) {
        return new LinkState(s, by, responded);
    }

    @Test
    void noLinkMeansNoRelationshipAndAFreshRequest() {
        assertEquals(Relationship.NONE, ContactRules.relationship(null, ME, NOW));
        assertEquals(RequestAction.CREATE, ContactRules.onRequest(null, ME, NOW));
        assertFalse(ContactRules.areContacts(null));
    }

    @Test
    void pendingLooksDifferentToSenderAndReceiver() {
        LinkState l = link(ContactStatus.PENDING, ME, null);
        assertEquals(Relationship.OUTGOING_PENDING, ContactRules.relationship(l, ME, NOW));
        assertEquals(Relationship.INCOMING_PENDING, ContactRules.relationship(l, YOU, NOW));
    }

    @Test
    void sendingTwiceIsHarmlessButAskingBackAccepts() {
        LinkState l = link(ContactStatus.PENDING, ME, null);
        assertEquals(RequestAction.ALREADY_PENDING, ContactRules.onRequest(l, ME, NOW));
        assertEquals(RequestAction.AUTO_ACCEPT, ContactRules.onRequest(l, YOU, NOW));
    }

    @Test
    void onlyTheReceiverCanAcceptOrDecline() {
        LinkState l = link(ContactStatus.PENDING, ME, null);
        assertTrue(ContactRules.canAccept(l, YOU));
        assertTrue(ContactRules.canDecline(l, YOU));
        assertFalse(ContactRules.canAccept(l, ME));
        assertFalse(ContactRules.canDecline(l, ME));
    }

    @Test
    void onlyTheSenderCanCancelAPendingRequest() {
        LinkState l = link(ContactStatus.PENDING, ME, null);
        assertTrue(ContactRules.canCancel(l, ME));
        assertFalse(ContactRules.canCancel(l, YOU));
        assertFalse(ContactRules.canCancel(link(ContactStatus.ACCEPTED, ME, NOW), ME));
    }

    @Test
    void acceptedPairsAreContactsForBothSidesAndCanBeRemoved() {
        LinkState l = link(ContactStatus.ACCEPTED, ME, NOW);
        assertEquals(Relationship.CONTACT, ContactRules.relationship(l, ME, NOW));
        assertEquals(Relationship.CONTACT, ContactRules.relationship(l, YOU, NOW));
        assertTrue(ContactRules.areContacts(l));
        assertTrue(ContactRules.canRemove(l));
        assertEquals(RequestAction.ALREADY_CONTACT, ContactRules.onRequest(l, ME, NOW));
        assertFalse(ContactRules.canAccept(l, YOU));
    }

    @Test
    void pendingAndDeclinedPairsAreNotContacts() {
        assertFalse(ContactRules.areContacts(link(ContactStatus.PENDING, ME, null)));
        assertFalse(ContactRules.areContacts(link(ContactStatus.DECLINED, ME, NOW)));
        assertFalse(ContactRules.canRemove(link(ContactStatus.PENDING, ME, null)));
    }

    @Test
    void aDeclineIsSilentToTheSenderAndInvisibleToTheDecliner() {
        LinkState l = link(ContactStatus.DECLINED, ME, NOW.minusDays(1));
        assertEquals(Relationship.OUTGOING_PENDING, ContactRules.relationship(l, ME, NOW)); // sender: still "requested"
        assertEquals(Relationship.NONE, ContactRules.relationship(l, YOU, NOW));            // decliner: nothing to see
        assertFalse(ContactRules.canAccept(l, YOU));
    }

    @Test
    void declinedSenderCannotRetryDuringTheCooldownButCanAfter() {
        assertEquals(RequestAction.ALREADY_PENDING,
                ContactRules.onRequest(link(ContactStatus.DECLINED, ME, NOW.minusDays(6)), ME, NOW));
        assertEquals(RequestAction.RENEW,
                ContactRules.onRequest(link(ContactStatus.DECLINED, ME, NOW.minusDays(8)), ME, NOW));
        // exactly at the boundary the cooldown is over
        assertEquals(RequestAction.RENEW,
                ContactRules.onRequest(link(ContactStatus.DECLINED, ME, NOW.minusDays(7)), ME, NOW));
        // after the cooldown the old decline no longer shows as "requested"
        assertEquals(Relationship.NONE,
                ContactRules.relationship(link(ContactStatus.DECLINED, ME, NOW.minusDays(8)), ME, NOW));
    }

    @Test
    void theDeciderCanAlwaysRequestTheOtherPersonBack() {
        // YOU declined ME's request earlier; now YOU asks ME: allowed immediately (no cooldown applies to the decliner)
        LinkState l = link(ContactStatus.DECLINED, ME, NOW.minusDays(1));
        assertEquals(RequestAction.RENEW, ContactRules.onRequest(l, YOU, NOW));
    }

    @Test
    void pairOrderingIsStable() {
        assertEquals(3, ContactRules.low(9, 3));
        assertEquals(9, ContactRules.high(9, 3));
        assertEquals(ContactRules.low(3, 9), ContactRules.low(9, 3));
    }
}
