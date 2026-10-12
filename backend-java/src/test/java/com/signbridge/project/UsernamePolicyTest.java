package com.signbridge.project;

import com.signbridge.project.util.UsernamePolicy;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class UsernamePolicyTest {

    @Test
    void normalizesCaseAndWhitespace() {
        assertEquals("rushi_01", UsernamePolicy.normalize("  Rushi_01 "));
        assertEquals("", UsernamePolicy.normalize(null));
    }

    @Test
    void acceptsGoodUsernames() {
        for (String ok : new String[]{"abc", "rushi", "rushi_01", "a1b2c3", "x".repeat(20), "RUSHI"}) {
            assertNull(UsernamePolicy.problem(ok), ok);
        }
    }

    @Test
    void rejectsBadUsernames() {
        for (String bad : new String[]{"", "ab", "x".repeat(21), "has space", "dot.name", "dash-name", "emoji😀x", "ünïcode", "@rushi"}) {
            assertNotNull(UsernamePolicy.problem(bad), bad);
            assertFalse(UsernamePolicy.isValid(bad), bad);
        }
    }

    @Test
    void rejectsReservedNames() {
        assertEquals("That username is reserved", UsernamePolicy.problem("Admin"));
        assertEquals("That username is reserved", UsernamePolicy.problem("signbridge"));
    }

    @Test
    void suggestionsFromEmailAreAlwaysValid() {
        String[][] cases = {
                {"rushi.patil+test@gmail.com", "rushi_patil_test"},
                {"Rushi@x.com", "rushi"},
                {"ab@x.com", "ab_user"},
                {"a@x.com", "a_user"},
                {"@x.com", "member"},
                {"admin@x.com", "admin_user"},
                {"___weird___name___@x.com", "weird_name"},
                {"averyveryverylongemailaddress@x.com", "averyveryverylong"},
        };
        for (String[] c : cases) {
            String s = UsernamePolicy.suggestFromEmail(c[0]);
            assertEquals(c[1].length() > 16 ? c[1].substring(0, 16) : c[1], s, c[0]);
            assertNull(UsernamePolicy.problem(s), c[0] + " -> " + s);
        }
    }

    @Test
    void firstFreeAddsNumbersUntilUnused() {
        Set<String> taken = Set.of("rushi", "rushi2", "rushi3");
        assertEquals("rushi4", UsernamePolicy.firstFree("rushi", taken::contains));
        assertEquals("fresh", UsernamePolicy.firstFree("fresh", taken::contains));
    }

    @Test
    void suffixNeverBreaksTheLengthLimit() {
        String base = "x".repeat(20);
        String s = UsernamePolicy.withSuffix(base, 12);
        assertEquals(20, s.length());
        assertTrue(s.endsWith("12"));
        assertNull(UsernamePolicy.problem(s));
    }
}
