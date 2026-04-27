package com.signbridge.project.repository;

import com.signbridge.project.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    boolean existsByEmail(String email);

    Optional<User> findByEmail(String email);

    Page<User> findByEmailContainingIgnoreCaseAndIdNot(
            String email,
            Integer id,
            Pageable pageable
    );

    Page<User> findAllByIdNot(Integer id, Pageable pageable);
}
