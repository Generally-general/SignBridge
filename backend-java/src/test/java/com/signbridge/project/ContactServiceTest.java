package com.signbridge.project;

import com.signbridge.project.dto.ContactRequestLists;
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
import com.signbridge.project.service.ContactService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.*;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

/** Runs the real ContactService against in-memory repositories (no database, no Spring). */
class ContactServiceTest {

    // ---------------------------------------------------------------- fakes
    // Dynamic proxies implement ONLY the repository methods ContactService uses, so these tests keep
    // compiling against the real Spring Data interfaces (which have dozens of methods).
    static class FakeUsers {
        final Map<Integer, User> byId = new LinkedHashMap<>();
        final UserRepository repo = (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(), new Class<?>[]{UserRepository.class}, this::handle);

        void add(int id, String name, String handle, Boolean searchable) {
            byId.put(id, User.builder().id(id).fullName(name).email(handle + "@mail.test").password("x")
                    .handle(handle).searchable(searchable).build());
        }

        @SuppressWarnings("unchecked")
        private Object handle(Object proxy, Method m, Object[] a) {
            switch (m.getName()) {
                case "existsByHandle":
                    return byId.values().stream().anyMatch(u -> a[0].equals(u.getHandle()));
                case "findByHandle":
                    return byId.values().stream().filter(u -> a[0].equals(u.getHandle())).findFirst();
                case "findByHandleIsNull":
                    return byId.values().stream().filter(u -> u.getHandle() == null).toList();
                case "searchByHandlePattern":
                    return search((String) a[0], (Integer) a[1]);
                case "findById":
                    return Optional.ofNullable(byId.get((Integer) a[0]));
                case "findAllById": {
                    List<User> r = new ArrayList<>();
                    for (Integer i : (Iterable<Integer>) a[0]) if (byId.containsKey(i)) r.add(byId.get(i));
                    return r;
                }
                case "save":
                case "saveAndFlush":
                    byId.put(((User) a[0]).getId(), (User) a[0]);
                    return a[0];
                case "existsById":
                    return byId.containsKey((Integer) a[0]);
                default:
                    throw new UnsupportedOperationException(m.getName());
            }
        }

        /** Emulates: handle LIKE :pattern ESCAPE '\' AND id <> :selfId AND (searchable IS NULL OR searchable = true) ORDER BY handle */
        private List<User> search(String pattern, Integer selfId) {
            StringBuilder re = new StringBuilder();
            for (int i = 0; i < pattern.length(); i++) {
                char c = pattern.charAt(i);
                if (c == '\\' && i + 1 < pattern.length()) re.append(Pattern.quote(String.valueOf(pattern.charAt(++i))));
                else if (c == '%') re.append(".*");
                else if (c == '_') re.append(".");
                else re.append(Pattern.quote(String.valueOf(c)));
            }
            Pattern p = Pattern.compile(re.toString());
            return byId.values().stream()
                    .filter(u -> u.getHandle() != null && p.matcher(u.getHandle()).matches())
                    .filter(u -> !u.getId().equals(selfId))
                    .filter(u -> u.getSearchable() == null || u.getSearchable())
                    .sorted(Comparator.comparing(User::getHandle))
                    .limit(10).toList();
        }
    }

    static class FakeLinks {
        final List<ContactLink> rows = new ArrayList<>();
        long seq = 0;
        final ContactLinkRepository repo = (ContactLinkRepository) Proxy.newProxyInstance(
                ContactLinkRepository.class.getClassLoader(), new Class<?>[]{ContactLinkRepository.class}, this::handle);

        private Object handle(Object proxy, Method m, Object[] a) {
            switch (m.getName()) {
                case "findByUserLowIdAndUserHighId":
                    return rows.stream().filter(l -> l.getUserLowId().equals(a[0]) && l.getUserHighId().equals(a[1])).findFirst();
                case "findByUserLowIdOrUserHighId":
                    return rows.stream().filter(l -> l.getUserLowId().equals(a[0]) || l.getUserHighId().equals(a[1])).toList();
                case "save": {
                    ContactLink e = (ContactLink) a[0];
                    if (e.getId() == null) { e.setId(++seq); rows.add(e); }
                    return e;
                }
                case "findById":
                    return rows.stream().filter(l -> l.getId().equals(a[0])).findFirst();
                case "delete":
                    rows.remove((ContactLink) a[0]);
                    return null;
                default:
                    throw new UnsupportedOperationException(m.getName());
            }
        }
    }

    FakeUsers users;
    FakeLinks links;
    ContactService svc;
    User ana, bob, cara;

    @BeforeEach
    void setUp() {
        users = new FakeUsers();
        users.add(1, "Ana", "ana_k", true);
        users.add(2, "Bob", "bobby", true);
        users.add(3, "Cara", "cara_x", true);
        users.add(4, "Hidden", "hidden_h", false);
        users.add(5, "Old Account", "oldie", null); // created before the "searchable" column existed
        users.add(6, "Wild", "abxcd", true);
        users.add(7, "Underscore", "ab_cd", true);
        links = new FakeLinks();
        svc = new ContactService(links.repo, users.repo);
        ana = users.byId.get(1);
        bob = users.byId.get(2);
        cara = users.byId.get(3);
    }

    // --------------------------------------------------------------- search
    @Test
    void searchNeedsThreeCharactersAndSafeCharacters() {
        assertTrue(svc.search(ana, "bo").isEmpty());
        assertTrue(svc.search(ana, "").isEmpty());
        assertTrue(svc.search(ana, "bo%").isEmpty());
        assertTrue(svc.search(ana, "b b").isEmpty());
        assertEquals(1, svc.search(ana, "bob").size());
    }

    @Test
    void searchIsPrefixBasedCaseInsensitiveAndAcceptsAtSign() {
        assertEquals("bobby", svc.search(ana, "@BoB").get(0).username());
        assertEquals("cara_x", svc.search(ana, "car").get(0).username());
    }

    @Test
    void searchNeverReturnsYourself() {
        assertTrue(svc.search(ana, "ana").isEmpty());
    }

    @Test
    void underscoreInASearchIsALiteralCharacterNotAWildcard() {
        List<UserSearchResult> r = svc.search(ana, "ab_");
        assertEquals(List.of("ab_cd"), r.stream().map(UserSearchResult::username).toList());
    }

    @Test
    void peopleWhoHideFromSearchAreOnlyFoundByTheirFullUsername() {
        assertTrue(svc.search(ana, "hid").isEmpty());
        assertEquals("hidden_h", svc.search(ana, "hidden_h").get(0).username());
    }

    @Test
    void oldAccountsWithNoSearchableValueAreDiscoverable() {
        assertEquals("oldie", svc.search(ana, "old").get(0).username());
    }

    @Test
    void searchResultsCarryTheRelationshipFromTheViewersSide() {
        svc.sendRequest(ana, "bobby");
        assertEquals("OUTGOING_PENDING", svc.search(ana, "bobby").get(0).relationship());
        assertEquals("INCOMING_PENDING", svc.search(bob, "ana_k").get(0).relationship());
        assertEquals("NONE", svc.search(cara, "bobby").get(0).relationship());
    }

    // ------------------------------------------------------------- requests
    @Test
    void requestAcceptContactsAndRemove() {
        assertFalse(svc.areContacts(1, 2));
        assertEquals(Relationship.OUTGOING_PENDING, svc.sendRequest(ana, "bobby"));
        assertFalse(svc.areContacts(1, 2));

        ContactRequestLists forBob = svc.listRequests(bob);
        assertEquals(1, forBob.incoming().size());
        assertEquals("ana_k", forBob.incoming().get(0).username());
        assertEquals(1, svc.listRequests(ana).outgoing().size());
        assertTrue(svc.listContacts(bob).isEmpty());

        svc.accept(bob, forBob.incoming().get(0).requestId());
        assertTrue(svc.areContacts(1, 2));
        assertTrue(svc.areContacts(2, 1));
        assertEquals(List.of("bobby"), svc.listContacts(ana).stream().map(ContactSummary::username).toList());
        assertEquals(List.of("ana_k"), svc.listContacts(bob).stream().map(ContactSummary::username).toList());
        assertTrue(svc.listRequests(ana).outgoing().isEmpty());

        svc.removeContact(bob, 1);
        assertFalse(svc.areContacts(1, 2));
        assertTrue(links.rows.isEmpty());
    }

    @Test
    void askingBackAcceptsTheirRequest() {
        svc.sendRequest(ana, "bobby");
        assertEquals(Relationship.CONTACT, svc.sendRequest(bob, "ana_k"));
        assertTrue(svc.areContacts(1, 2));
        assertEquals(1, links.rows.size());
    }

    @Test
    void repeatingARequestChangesNothing() {
        svc.sendRequest(ana, "bobby");
        svc.sendRequest(ana, "bobby");
        assertEquals(1, links.rows.size());
        assertEquals(Relationship.OUTGOING_PENDING, svc.sendRequest(ana, "bobby"));
    }

    @Test
    void aDeclineIsSilentToTheSenderAndNotACallPermission() {
        svc.sendRequest(ana, "bobby");
        long id = svc.listRequests(bob).incoming().get(0).requestId();
        svc.decline(bob, id);

        assertFalse(svc.areContacts(1, 2));
        assertTrue(svc.listRequests(bob).incoming().isEmpty());                    // gone for Bob
        assertEquals(1, svc.listRequests(ana).outgoing().size());                  // Ana still sees "requested"
        assertEquals(Relationship.OUTGOING_PENDING, svc.sendRequest(ana, "bobby")); // and cannot spam
        assertEquals(ContactStatus.DECLINED, links.rows.get(0).getStatus());
    }

    @Test
    void theOneWhoDeclinedCanStillRequestTheOtherPerson() {
        svc.sendRequest(ana, "bobby");
        svc.decline(bob, svc.listRequests(bob).incoming().get(0).requestId());

        assertEquals(Relationship.OUTGOING_PENDING, svc.sendRequest(bob, "ana_k"));
        assertEquals(1, svc.listRequests(ana).incoming().size());
        svc.accept(ana, svc.listRequests(ana).incoming().get(0).requestId());
        assertTrue(svc.areContacts(1, 2));
    }

    @Test
    void onlyTheReceiverCanAcceptOrDecline() {
        svc.sendRequest(ana, "bobby");
        long id = svc.listRequests(ana).outgoing().get(0).requestId();
        assertThrows(ConflictException.class, () -> svc.accept(ana, id));
        assertThrows(ConflictException.class, () -> svc.decline(ana, id));
        assertFalse(svc.areContacts(1, 2));
    }

    @Test
    void aStrangerCannotTouchSomeoneElsesRequest() {
        svc.sendRequest(ana, "bobby");
        long id = svc.listRequests(ana).outgoing().get(0).requestId();
        assertThrows(ResourceNotFoundException.class, () -> svc.accept(cara, id));
        assertThrows(ResourceNotFoundException.class, () -> svc.cancel(cara, id));
        assertThrows(ResourceNotFoundException.class, () -> svc.accept(bob, 999));
    }

    @Test
    void theSenderCanCancelButTheReceiverCannot() {
        svc.sendRequest(ana, "bobby");
        long id = svc.listRequests(ana).outgoing().get(0).requestId();
        assertThrows(ConflictException.class, () -> svc.cancel(bob, id));
        svc.cancel(ana, id);
        assertTrue(links.rows.isEmpty());
        assertEquals(Relationship.OUTGOING_PENDING, svc.sendRequest(ana, "bobby")); // can ask again
    }

    @Test
    void invalidRequestsAreRejected() {
        assertThrows(BadRequestException.class, () -> svc.sendRequest(ana, "@Ana_K"));
        assertThrows(ResourceNotFoundException.class, () -> svc.sendRequest(ana, "nobody_here"));
        assertThrows(ResourceNotFoundException.class, () -> svc.sendRequest(ana, ""));
    }

    @Test
    void youCannotRemoveSomeoneWhoIsNotAContact() {
        assertThrows(ResourceNotFoundException.class, () -> svc.removeContact(ana, 2));
        svc.sendRequest(ana, "bobby");
        assertThrows(ResourceNotFoundException.class, () -> svc.removeContact(ana, 2)); // pending is not a contact
    }

    @Test
    void thereIsALimitOnPendingOutgoingRequests() {
        for (int i = 100; i < 150; i++) users.add(i, "U" + i, "user" + i, true);
        for (int i = 100; i < 150; i++) svc.sendRequest(ana, "user" + i);
        users.add(999, "One too many", "toomany", true);
        assertThrows(BadRequestException.class, () -> svc.sendRequest(ana, "toomany"));
    }

    @Test
    void aPersonIsNeverAContactOfThemselves() {
        assertFalse(svc.areContacts(1, 1));
    }
}
