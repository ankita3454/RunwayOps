-- =====================================================================
-- 03_procedures.sql  -- stored procedures / functions with transactions
-- Owner: Ankitha
-- =====================================================================
USE runwayops;

DROP PROCEDURE IF EXISTS book_slot;
DROP PROCEDURE IF EXISTS cancel_booking;
DROP FUNCTION  IF EXISTS fn_designer_total_paid;

DELIMITER $$

-- ---------------------------------------------------------------------
-- book_slot: pay for a slot AND allocate the collection as ONE transaction.
-- If anything fails (slot taken, wrong owner, trigger rejects the show time)
-- the whole thing rolls back: no payment, no receipt, no allocation.
-- ---------------------------------------------------------------------
CREATE PROCEDURE book_slot(
    IN  p_designer_id    INT,
    IN  p_collection_id  INT,
    IN  p_venue_id       INT,
    IN  p_slot_no        INT,
    IN  p_mode           VARCHAR(20),
    IN  p_rehearsal      DATETIME,
    IN  p_show           DATETIME,
    OUT p_payment_id     INT,
    OUT p_receipt_no     INT
)
BEGIN
    DECLARE v_fee   DECIMAL(10,2);
    DECLARE v_owner INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;            -- pass the original error message back to the app
    END;

    START TRANSACTION;

    -- the collection must belong to the designer who is paying
    SELECT Designer_ID INTO v_owner FROM COLLECTION WHERE Collection_ID = p_collection_id;
    IF v_owner IS NULL OR v_owner <> p_designer_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection does not belong to this designer';
    END IF;

    -- lock the slot row so two concurrent bookings cannot both pass the checks
    SELECT Slot_Fee INTO v_fee FROM RUNWAY_SEGMENT
    WHERE Venue_ID = p_venue_id AND Slot_No = p_slot_no
    FOR UPDATE;
    IF v_fee IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Slot does not exist';
    END IF;

    IF EXISTS (SELECT 1 FROM ALLOCATED_TO WHERE Venue_ID = p_venue_id AND Slot_No = p_slot_no) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Slot is already allocated';
    END IF;

    IF EXISTS (SELECT 1 FROM ALLOCATED_TO WHERE Collection_ID = p_collection_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection already has a slot';
    END IF;

    -- 1. payment (trg_auto_receipt fires here and creates the RECEIPT)
    INSERT INTO PAYMENT (Amount, Payment_Mode, Status, Designer_ID, Venue_ID, Slot_No)
    VALUES (v_fee, p_mode, 'SUCCESS', p_designer_id, p_venue_id, p_slot_no);
    SET p_payment_id = LAST_INSERT_ID();

    -- 2. allocation (trg_allocation_check verifies payment + show time)
    INSERT INTO ALLOCATED_TO (Collection_ID, Venue_ID, Slot_No, Rehearsal_Time, Show_Time)
    VALUES (p_collection_id, p_venue_id, p_slot_no, p_rehearsal, p_show);

    SELECT Receipt_No INTO p_receipt_no FROM RECEIPT WHERE Payment_ID = p_payment_id;

    COMMIT;
END$$

-- ---------------------------------------------------------------------
-- cancel_booking: refund the payment and free the slot, atomically
-- ---------------------------------------------------------------------
CREATE PROCEDURE cancel_booking(IN p_designer_id INT, IN p_collection_id INT)
BEGIN
    DECLARE v_venue INT;
    DECLARE v_slot  INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT a.Venue_ID, a.Slot_No INTO v_venue, v_slot
    FROM ALLOCATED_TO a JOIN COLLECTION c ON c.Collection_ID = a.Collection_ID
    WHERE a.Collection_ID = p_collection_id AND c.Designer_ID = p_designer_id
    FOR UPDATE;

    IF v_venue IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No booking found for this collection';
    END IF;

    UPDATE PAYMENT SET Status = 'REFUNDED'
    WHERE Designer_ID = p_designer_id AND Venue_ID = v_venue AND Slot_No = v_slot
      AND Status = 'SUCCESS';

    DELETE FROM ALLOCATED_TO WHERE Collection_ID = p_collection_id;

    COMMIT;
END$$

-- ---------------------------------------------------------------------
-- fn_designer_total_paid: stored function used in queries and views
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_designer_total_paid(p_designer_id INT)
RETURNS DECIMAL(12,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_total DECIMAL(12,2);
    SELECT COALESCE(SUM(Amount), 0) INTO v_total
    FROM PAYMENT WHERE Designer_ID = p_designer_id AND Status = 'SUCCESS';
    RETURN v_total;
END$$

DELIMITER ;
