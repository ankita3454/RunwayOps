-- =====================================================================
-- RunwayOps : Fashion Week / Runway Show Management
-- 01_schema.sql  -- DDL: tables, keys, constraints
-- Requires MySQL 8.0.16+ (CHECK constraints are enforced from 8.0.16)
-- Owners: Venue & Ops tables -> Ankita | Designer & Finance tables -> Ankitha
-- =====================================================================

DROP DATABASE IF EXISTS runwayops;
CREATE DATABASE runwayops CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE runwayops;

-- ---------------------------------------------------------------------
-- USER_ACCOUNT  (Ankita)  -- login + role-based access
-- ---------------------------------------------------------------------
CREATE TABLE USER_ACCOUNT (
    User_ID        INT AUTO_INCREMENT PRIMARY KEY,
    Email          VARCHAR(120) NOT NULL UNIQUE,
    Password_Hash  VARCHAR(100) NOT NULL,
    Role           VARCHAR(20)  NOT NULL,
    Created_At     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Is_Active      BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_user_role  CHECK (Role IN ('ADMIN','DESIGNER','STAFF','MODEL')),
    CONSTRAINT chk_user_email CHECK (Email LIKE '%_@_%._%')
);

-- ---------------------------------------------------------------------
-- VENUE  (Ankita)
-- ---------------------------------------------------------------------
CREATE TABLE VENUE (
    Venue_ID    INT AUTO_INCREMENT PRIMARY KEY,
    Venue_Name  VARCHAR(100) NOT NULL UNIQUE,
    Location    VARCHAR(150) NOT NULL,
    Capacity    INT          NOT NULL,
    CONSTRAINT chk_venue_capacity CHECK (Capacity > 0)
);

-- ---------------------------------------------------------------------
-- RUNWAY_SEGMENT  (Ankita)  -- WEAK ENTITY, owner = VENUE
-- PK = (Venue_ID, Slot_No); Slot_No is only meaningful within a venue
-- ---------------------------------------------------------------------
CREATE TABLE RUNWAY_SEGMENT (
    Venue_ID      INT          NOT NULL,
    Slot_No       INT          NOT NULL,
    Segment_Type  VARCHAR(30)  NOT NULL,
    Slot_Date     DATE         NOT NULL,
    Start_Time    TIME         NOT NULL,
    End_Time      TIME         NOT NULL,
    Slot_Fee      DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (Venue_ID, Slot_No),
    CONSTRAINT fk_segment_venue FOREIGN KEY (Venue_ID)
        REFERENCES VENUE(Venue_ID) ON DELETE CASCADE,
    CONSTRAINT chk_segment_time CHECK (End_Time > Start_Time),
    CONSTRAINT chk_segment_fee  CHECK (Slot_Fee > 0),
    CONSTRAINT chk_segment_slot CHECK (Slot_No > 0),
    CONSTRAINT chk_segment_type CHECK (Segment_Type IN ('OPENING','MAIN','FINALE','CAPSULE'))
);

-- ---------------------------------------------------------------------
-- STAFF  (Ankita)  -- RECURSIVE: STAFF supervises STAFF
-- ---------------------------------------------------------------------
CREATE TABLE STAFF (
    Staff_ID       INT AUTO_INCREMENT PRIMARY KEY,
    Staff_Name     VARCHAR(100) NOT NULL,
    Staff_Role     VARCHAR(30)  NOT NULL,
    Contact        VARCHAR(15)  NOT NULL,
    Supervisor_ID  INT          NULL,
    User_ID        INT          NULL UNIQUE,
    CONSTRAINT chk_staff_role CHECK (Staff_Role IN ('SHOW_DIRECTOR','BACKSTAGE_COORDINATOR','ASSISTANT_STYLIST')),
    CONSTRAINT chk_staff_contact CHECK (Contact REGEXP '^[0-9]{10}$'),
    CONSTRAINT fk_staff_user FOREIGN KEY (User_ID)
        REFERENCES USER_ACCOUNT(User_ID) ON DELETE SET NULL
);
-- The self-referencing FK is added with ALTER (demonstrates ALTER TABLE)
ALTER TABLE STAFF
    ADD CONSTRAINT fk_staff_supervisor FOREIGN KEY (Supervisor_ID)
        REFERENCES STAFF(Staff_ID) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- FACILITY  (Ankita)
-- ---------------------------------------------------------------------
CREATE TABLE FACILITY (
    Facility_ID    INT AUTO_INCREMENT PRIMARY KEY,
    Facility_Name  VARCHAR(100) NOT NULL,
    Facility_Type  VARCHAR(20)  NOT NULL,
    Venue_ID       INT          NOT NULL,
    CONSTRAINT fk_facility_venue FOREIGN KEY (Venue_ID)
        REFERENCES VENUE(Venue_ID) ON DELETE CASCADE,
    CONSTRAINT chk_facility_type CHECK (Facility_Type IN ('BACKSTAGE_LOUNGE','PRESS_PIT','HAIR_MAKEUP_BAY'))
);

-- ---------------------------------------------------------------------
-- MODEL  (Ankita)
-- ---------------------------------------------------------------------
CREATE TABLE MODEL (
    Model_ID    INT AUTO_INCREMENT PRIMARY KEY,
    Model_Name  VARCHAR(100) NOT NULL,
    Agency      VARCHAR(100) NOT NULL,
    Contact     VARCHAR(15)  NOT NULL,
    User_ID     INT          NULL UNIQUE,
    CONSTRAINT chk_model_contact CHECK (Contact REGEXP '^[0-9]{10}$'),
    CONSTRAINT fk_model_user FOREIGN KEY (User_ID)
        REFERENCES USER_ACCOUNT(User_ID) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- USES  (Ankita)  -- MODEL M:N FACILITY, attribute Usage_Date
-- ---------------------------------------------------------------------
CREATE TABLE USES (
    Model_ID     INT  NOT NULL,
    Facility_ID  INT  NOT NULL,
    Usage_Date   DATE NOT NULL,
    PRIMARY KEY (Model_ID, Facility_ID, Usage_Date),
    CONSTRAINT fk_uses_model FOREIGN KEY (Model_ID)
        REFERENCES MODEL(Model_ID) ON DELETE CASCADE,
    CONSTRAINT fk_uses_facility FOREIGN KEY (Facility_ID)
        REFERENCES FACILITY(Facility_ID) ON DELETE CASCADE
);
