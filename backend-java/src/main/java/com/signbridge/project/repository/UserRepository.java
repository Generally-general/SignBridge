package com.signbridge.project.repository;

import com.signbridge.project.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

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

    boolean existsByHandle(String handle);

    Optional<User> findByHandle(String handle);

    List<User> findByHandleIsNull();

    @Query("select u from User u where u.handle like :pattern escape '\\' and u.id <> :selfId "
            + "and (u.searchable is null or u.searchable = true) order by u.handle")
    List<User> searchByHandlePattern(
            @Param("pattern") String pattern,
            @Param("selfId") Integer selfId,
            Pageable pageable
    );
}
