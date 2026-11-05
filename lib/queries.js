// Shared SQL used by more than one page. [Ankita]

// Whole organisation, top-down. Path keeps children directly under their parent.
export const HIERARCHY_SQL = `
WITH RECURSIVE hierarchy AS (
    SELECT Staff_ID, Staff_Name, Staff_Role, Contact, Supervisor_ID, 0 AS Level,
           CAST(LPAD(Staff_ID, 4, '0') AS CHAR(500)) AS Path
    FROM STAFF WHERE Supervisor_ID IS NULL
    UNION ALL
    SELECT s.Staff_ID, s.Staff_Name, s.Staff_Role, s.Contact, s.Supervisor_ID, h.Level + 1,
           CONCAT(h.Path, '/', LPAD(s.Staff_ID, 4, '0'))
    FROM STAFF s JOIN hierarchy h ON s.Supervisor_ID = h.Staff_ID
)
SELECT h.*, sup.Staff_Name AS Supervisor_Name
FROM hierarchy h LEFT JOIN STAFF sup ON sup.Staff_ID = h.Supervisor_ID
ORDER BY h.Path`;

// Everyone below one staff member (their team), any depth. Param: Staff_ID
export const SUBTREE_SQL = `
WITH RECURSIVE team AS (
    SELECT Staff_ID, Staff_Name, Staff_Role, Supervisor_ID, 0 AS Depth
    FROM STAFF WHERE Staff_ID = ?
    UNION ALL
    SELECT s.Staff_ID, s.Staff_Name, s.Staff_Role, s.Supervisor_ID, t.Depth + 1
    FROM STAFF s JOIN team t ON s.Supervisor_ID = t.Staff_ID
)
SELECT t.*, sup.Staff_Name AS Supervisor_Name
FROM team t LEFT JOIN STAFF sup ON sup.Staff_ID = t.Supervisor_ID
WHERE t.Depth > 0
ORDER BY t.Depth, t.Staff_Name`;
