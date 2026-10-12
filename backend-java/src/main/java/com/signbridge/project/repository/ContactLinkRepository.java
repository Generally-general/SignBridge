package com.signbridge.project.repository;

import com.signbridge.project.entity.ContactLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContactLinkRepository extends JpaRepository<ContactLink, Long> {

    Optional<ContactLink> findByUserLowIdAndUserHighId(Integer userLowId, Integer userHighId);

    // pass the same id twice: every link the user is part of, in either position
    List<ContactLink> findByUserLowIdOrUserHighId(Integer userLowId, Integer userHighId);
}
