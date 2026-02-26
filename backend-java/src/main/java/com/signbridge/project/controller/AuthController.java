package com.signbridge.project.controller;

import com.signbridge.project.entity.User;
import com.signbridge.project.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        User savedUser = userService.saveUser(user);
        return ResponseEntity.ok("User registered successfully with id: " + savedUser.getId());
    }

    @GetMapping("/check-user")
    public ResponseEntity<?> checkUser(@RequestParam String email) {
        User user = userService.getUserByEmail(email);
        if(user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(404).body("User not found");
    }
}
