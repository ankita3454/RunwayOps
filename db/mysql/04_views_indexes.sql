-- =====================================================================
-- 04_views_indexes.sql  -- views (dashboards) + indexes + full-text search
-- Owner: Ankita
-- =====================================================================
USE runwayops;

-- ---------------------------------------------------------------------
-- Show schedule: collection -> designer -> allocation -> segment -> venue
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_show_schedule AS
SELECT  v.Venue_ID, v.Venue_Name, r.Slot_No, r.Segment_Type, r.Slot_Date,
        r.Start_Time, r.End_Time,
        c.Collection_ID, c.Collection_Name, c.Theme, c.Season,
        d.Designer_ID, d.Designer_Name, d.Brand_Name,
        a.Rehearsal_Time, a.Show_Time
FROM ALLOCATED_TO a
JOIN COLLECTION     c ON c.Collection_ID = a.Collection_ID
JOIN DESIGNER       d ON d.Designer_ID   = c.Designer_ID
JOIN RUNWAY_SEGMENT r ON r.Venue_ID = a.Venue_ID AND r.Slot_No = a.Slot_No
JOIN VENUE          v ON v.Venue_ID = r.Venue_ID;

-- ---------------------------------------------------------------------
-- Slot utilisation per venue (LEFT JOIN so venues with 0 bookings show)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_slot_utilisation AS
SELECT  v.Venue_ID, v.Venue_Name,
        COUNT(r.Slot_No)                       AS Total_Slots,
        COUNT(a.Collection_ID)                 AS Booked_Slots,
        ROUND(100 * COUNT(a.Collection_ID) / NULLIF(COUNT(r.Slot_No), 0), 1) AS Utilisation_Pct
FROM VENUE v
LEFT JOIN RUNWAY_SEGMENT r ON r.Venue_ID = v.Venue_ID
LEFT JOIN ALLOCATED_TO   a ON a.Venue_ID = r.Venue_ID AND a.Slot_No = r.Slot_No
GROUP BY v.Venue_ID, v.Venue_Name;

-- ---------------------------------------------------------------------
-- Revenue per venue from successful payments
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_venue_revenue AS
SELECT  v.Venue_ID, v.Venue_Name,
        COUNT(p.Payment_ID)          AS Payments,
        COALESCE(SUM(p.Amount), 0)   AS Revenue
FROM VENUE v
LEFT JOIN PAYMENT p ON p.Venue_ID = v.Venue_ID AND p.Status = 'SUCCESS'
GROUP BY v.Venue_ID, v.Venue_Name;

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
-- overlap trigger + "free slots on a date" both filter on venue + date + time
CREATE INDEX idx_segment_venue_date ON RUNWAY_SEGMENT (Venue_ID, Slot_Date, Start_Time);
-- revenue view and payment history filter on status and date
CREATE INDEX idx_payment_status_date ON PAYMENT (Status, Payment_Date);
