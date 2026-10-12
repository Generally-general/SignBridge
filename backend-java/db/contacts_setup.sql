-- Run in SQL Server Management Studio, database SignBridge, AFTER starting the backend once
-- (the backend creates the contact_links table and the new users columns by itself).

-- 1) Usernames must be unique. A FILTERED index ignores accounts that have none yet.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_users_handle' AND object_id = OBJECT_ID('users'))
    CREATE UNIQUE INDEX UX_users_handle ON users(handle) WHERE handle IS NOT NULL;

-- 2) TESTING ONLY: make every existing account a contact of every other, so the dashboard is not
--    empty before the "add contact" screen exists. Skip this in a real deployment.
INSERT INTO contact_links (user_low_id, user_high_id, requested_by, status, created_at, responded_at)
SELECT a.id, b.id, a.id, 'ACCEPTED', SYSDATETIME(), SYSDATETIME()
FROM users a
JOIN users b ON a.id < b.id
WHERE NOT EXISTS (
    SELECT 1 FROM contact_links c WHERE c.user_low_id = a.id AND c.user_high_id = b.id
);

-- Check:
SELECT id, email, handle, searchable FROM users;
SELECT * FROM contact_links;
