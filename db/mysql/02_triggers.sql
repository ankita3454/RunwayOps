-- =====================================================================
-- 02_triggers.sql  -- business rules enforced inside the database
-- =====================================================================
USE runwayops;

DROP TRIGGER IF EXISTS trg_no_slot_overlap;
DROP TRIGGER IF EXISTS trg_no_slot_overlap_upd;
DROP TRIGGER IF EXISTS trg_supervisor_check;
DROP TRIGGER IF EXISTS trg_supervisor_check_upd;

DELIMITER $$

-- ---------------------------------------------------------------------
-- [Ankita] No two runway segments at the same venue may overlap in time
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_no_slot_overlap
BEFORE INSERT ON RUNWAY_SEGMENT
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM RUNWAY_SEGMENT s
        WHERE s.Venue_ID  = NEW.Venue_ID
          AND s.Slot_Date = NEW.Slot_Date
          AND NEW.Start_Time < s.End_Time
          AND NEW.End_Time   > s.Start_Time
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Slot overlaps an existing segment at this venue on this date';
    END IF;
END$$

CREATE TRIGGER trg_no_slot_overlap_upd
BEFORE UPDATE ON RUNWAY_SEGMENT
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM RUNWAY_SEGMENT s
        WHERE s.Venue_ID  = NEW.Venue_ID
          AND s.Slot_Date = NEW.Slot_Date
          AND s.Slot_No  <> OLD.Slot_No
          AND NEW.Start_Time < s.End_Time
          AND NEW.End_Time   > s.Start_Time
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Slot overlaps an existing segment at this venue on this date';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- [Ankita] Supervisor rules for the recursive relationship.
-- A CHECK constraint cannot look at another row, so this needs a trigger:
--   * nobody supervises themselves
--   * an ASSISTANT_STYLIST cannot supervise anyone
--   * only a SHOW_DIRECTOR may be left without a supervisor
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_supervisor_check
BEFORE INSERT ON STAFF
FOR EACH ROW
BEGIN
    DECLARE sup_role VARCHAR(30);
    IF NEW.Supervisor_ID IS NULL AND NEW.Staff_Role <> 'SHOW_DIRECTOR' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only a SHOW_DIRECTOR can have no supervisor';
    END IF;
    IF NEW.Supervisor_ID IS NOT NULL THEN
        SELECT Staff_Role INTO sup_role FROM STAFF WHERE Staff_ID = NEW.Supervisor_ID;
        IF sup_role = 'ASSISTANT_STYLIST' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'An ASSISTANT_STYLIST cannot supervise other staff';
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_supervisor_check_upd
BEFORE UPDATE ON STAFF
FOR EACH ROW
BEGIN
    DECLARE sup_role VARCHAR(30);
    IF NEW.Supervisor_ID = NEW.Staff_ID THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A staff member cannot supervise themselves';
    END IF;
    IF NEW.Supervisor_ID IS NULL AND NEW.Staff_Role <> 'SHOW_DIRECTOR' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only a SHOW_DIRECTOR can have no supervisor';
    END IF;
    IF NEW.Supervisor_ID IS NOT NULL THEN
        SELECT Staff_Role INTO sup_role FROM STAFF WHERE Staff_ID = NEW.Supervisor_ID;
        IF sup_role = 'ASSISTANT_STYLIST' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'An ASSISTANT_STYLIST cannot supervise other staff';
        END IF;
    END IF;
END$$

DELIMITER ;
