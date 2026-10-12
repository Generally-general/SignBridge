package com.signbridge.project;

import com.signbridge.project.util.PasswordPolicy;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordPolicyTest {

    @Test
    void rejectsMissingAndShort() {
        assertNotNull(PasswordPolicy.problem(null));
        assertNotNull(PasswordPolicy.problem("   "));
        assertNotNull(PasswordPolicy.problem("1234567"));
    }

    @Test
    void acceptsEightToSeventyTwoBytes() {
        assertNull(PasswordPolicy.problem("12345678"));
        assertNull(PasswordPolicy.problem("a".repeat(72)));
    }

    @Test
    void rejectsMoreThanSeventyTwoBytes() {
        assertNotNull(PasswordPolicy.problem("a".repeat(73)));
        assertNotNull(PasswordPolicy.problem("é".repeat(37)));
    }
}