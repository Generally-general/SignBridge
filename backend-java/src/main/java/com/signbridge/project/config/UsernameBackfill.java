package com.signbridge.project.config;

import com.signbridge.project.entity.User;
import com.signbridge.project.repository.UserRepository;
import com.signbridge.project.util.UsernamePolicy;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Accounts created before usernames existed get one at startup (derived from the email, made unique). */
@Component
@RequiredArgsConstructor
public class UsernameBackfill implements ApplicationRunner {
    private final UserRepository users;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<User> missing = users.findByHandleIsNull();
        for (User u : missing) {
            u.setHandle(UsernamePolicy.firstFree(UsernamePolicy.suggestFromEmail(u.getEmail()), users::existsByHandle));
            users.saveAndFlush(u); // flush so the next existsByHandle sees it
        }
    }
}
