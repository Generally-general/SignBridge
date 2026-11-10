package com.signbridge.project.repository;

import com.signbridge.project.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUserId(Integer userId);

    Optional<PushSubscription> findByEndpoint(String endpoint);

    void deleteByEndpoint(String endpoint);
}