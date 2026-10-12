package com.signbridge.project.repository;

import com.signbridge.project.entity.ContactCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContactCardRepository extends JpaRepository<ContactCard, Long> {
    Optional<ContactCard> findByToken(String token);

    Optional<ContactCard> findByUserId(Integer userId);

    void deleteByUserId(Integer userId);
}