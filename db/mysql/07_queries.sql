-- =====================================================================
-- 07_queries.sql  -- the "important queries" for the demo and the report
-- Every one of these is also used somewhere in the web app.
-- =====================================================================
USE runwayops;

-- Q1 [Ankita] RECURSIVE CTE: full staff hierarchy under the head director
WITH RECURSIVE hierarchy AS (
    SELECT Staff_ID, Staff_Name, Staff_Role, Supervisor_ID, 0 AS Level,
           CAST(Staff_Name AS CHAR(500)) AS Chain
    FROM STAFF WHERE Supervisor_ID IS NULL
    UNION ALL
    SELECT s.Staff_ID, s.Staff_Name, s.Staff_Role, s.Supervisor_ID, h.Level + 1,
           CONCAT(h.Chain, ' > ', s.Staff_Name)
    FROM STAFF s JOIN hierarchy h ON s.Supervisor_ID = h.Staff_ID
)
SELECT Level, Staff_Name, Staff_Role, Chain FROM hierarchy ORDER BY Chain;

-- Q2 [Ankita] JOIN across 5 tables: the show schedule (also the view v_show_schedule)
SELECT v.Venue_Name, r.Slot_Date, r.Start_Time, r.Segment_Type,
       c.Collection_Name, d.Brand_Name, a.Show_Time
FROM ALLOCATED_TO a
JOIN COLLECTION c     ON c.Collection_ID = a.Collection_ID
JOIN DESIGNER d       ON d.Designer_ID = c.Designer_ID
JOIN RUNWAY_SEGMENT r ON r.Venue_ID = a.Venue_ID AND r.Slot_No = a.Slot_No
JOIN VENUE v          ON v.Venue_ID = r.Venue_ID
ORDER BY r.Slot_Date, r.Start_Time;

-- Q3 [Ankita] GROUP BY + HAVING: venues whose revenue crosses 2,00,000
SELECT v.Venue_Name, COUNT(*) AS Bookings, SUM(p.Amount) AS Revenue
FROM PAYMENT p JOIN VENUE v ON v.Venue_ID = p.Venue_ID
WHERE p.Status = 'SUCCESS'
GROUP BY v.Venue_ID, v.Venue_Name
HAVING SUM(p.Amount) > 200000
ORDER BY Revenue DESC;

-- Q4 [Ankita] LEFT JOIN + IS NULL: free slots still available to book
SELECT r.Venue_ID, v.Venue_Name, r.Slot_No, r.Segment_Type, r.Slot_Date,
       r.Start_Time, r.End_Time, r.Slot_Fee
FROM RUNWAY_SEGMENT r
JOIN VENUE v ON v.Venue_ID = r.Venue_ID
LEFT JOIN ALLOCATED_TO a ON a.Venue_ID = r.Venue_ID AND a.Slot_No = r.Slot_No
WHERE a.Collection_ID IS NULL
ORDER BY r.Slot_Date, r.Start_Time;

-- Q9 [Ankita] M:N: which models use which facility on which day
SELECT m.Model_Name, f.Facility_Name, f.Facility_Type, v.Venue_Name, u.Usage_Date
FROM USES u
JOIN MODEL m    ON m.Model_ID = u.Model_ID
JOIN FACILITY f ON f.Facility_ID = u.Facility_ID
JOIN VENUE v    ON v.Venue_ID = f.Venue_ID
ORDER BY u.Usage_Date, f.Facility_Name;

-- Q10 Views
SELECT * FROM v_slot_utilisation ORDER BY Utilisation_Pct DESC;
SELECT * FROM v_venue_revenue ORDER BY Revenue DESC;
