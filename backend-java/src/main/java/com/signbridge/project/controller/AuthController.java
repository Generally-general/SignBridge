package com.signbridge.project.controller;

import com.signbridge.project.entity.User;
import com.signbridge.project.service.UserService;
import com.signbridge.project.util.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserService userService;
    private final JwtUtil jwtUtil;

    public AuthController(UserService userService, JwtUtil jwtUtil) {
        this.userService = userService;
        this.jwtUtil = jwtUtil;
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

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        User user = userService.loginUser(loginRequest.getEmail(), loginRequest.getPassword());

        if(user != null) {
            String token = jwtUtil.generateToken(user.getEmail(), user.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("user", user);
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }
}
