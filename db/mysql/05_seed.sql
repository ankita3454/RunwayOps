-- =====================================================================
-- 05_seed.sql  -- demo data
-- Demo logins:   admin@runwayops.in / admin123
--                every other account   / password123
-- =====================================================================
USE runwayops;

-- ---------------- USER_ACCOUNT ----------------
INSERT INTO USER_ACCOUNT (User_ID, Email, Password_Hash, Role) VALUES
 (1,  'admin@runwayops.in',     '$2b$10$QOectkrbW1fa0QPUDZ1Z7OxI8OcihNGQ50o.VCqPoaQpf28AKcUGq', 'ADMIN'),
 (2,  'aarav@noir.in',          '$2b$10$jVfUUCP4s7ilMsCWQchiHurUb80Z15RsJ9iMP10i8/x.vq/6Y2OIO', 'DESIGNER'),
 (3,  'meera@kesari.in',        '$2b$10$jVfUUCP4s7ilMsCWQchiHurUb80Z15RsJ9iMP10i8/x.vq/6Y2OIO', 'DESIGNER'),
 (4,  'rohan@loom.in',          '$2b$10$jVfUUCP4s7ilMsCWQchiHurUb80Z15RsJ9iMP10i8/x.vq/6Y2OIO', 'DESIGNER'),
 (5,  'isha@verdant.in',        '$2b$10$jVfUUCP4s7ilMsCWQchiHurUb80Z15RsJ9iMP10i8/x.vq/6Y2OIO', 'DESIGNER'),
 (6,  'kavya.staff@runwayops.in','$2b$10$jVfUUCP4s7ilMsCWQchiHurUb80Z15RsJ9iMP10i8/x.vq/6Y2OIO', 'STAFF'),
 (7,  'dev.staff@runwayops.in', '$2b$10$jVfUUCP4s7ilMsCWQchiHurUb80Z15RsJ9iMP10i8/x.vq/6Y2OIO', 'STAFF'),
 (8,  'tara@elitemodels.in',    '$2b$10$jVfUUCP4s7ilMsCWQchiHurUb80Z15RsJ9iMP10i8/x.vq/6Y2OIO', 'MODEL'),
 (9,  'nikhil@inega.in',        '$2b$10$jVfUUCP4s7ilMsCWQchiHurUb80Z15RsJ9iMP10i8/x.vq/6Y2OIO', 'MODEL');

-- ---------------- VENUE ----------------
INSERT INTO VENUE (Venue_ID, Venue_Name, Location, Capacity) VALUES
 (1, 'Palace Grounds Pavilion', 'Bengaluru', 800),
 (2, 'Jio World Convention Hall', 'Mumbai', 1200),
 (3, 'Bikaner House Lawns', 'New Delhi', 450);

-- ---------------- RUNWAY_SEGMENT (weak) ----------------
INSERT INTO RUNWAY_SEGMENT (Venue_ID, Slot_No, Segment_Type, Slot_Date, Start_Time, End_Time, Slot_Fee) VALUES
 (1, 1, 'OPENING', '2026-11-20', '10:00', '11:00', 150000),
 (1, 2, 'MAIN',    '2026-11-20', '11:30', '12:30', 120000),
 (1, 3, 'MAIN',    '2026-11-20', '14:00', '15:00', 120000),
 (1, 4, 'FINALE',  '2026-11-20', '18:00', '19:30', 250000),
 (1, 5, 'CAPSULE', '2026-11-21', '11:00', '11:45',  60000),
 (2, 1, 'OPENING', '2026-11-22', '10:00', '11:00', 180000),
 (2, 2, 'MAIN',    '2026-11-22', '12:00', '13:00', 140000),
 (2, 3, 'FINALE',  '2026-11-22', '19:00', '20:30', 300000),
 (3, 1, 'MAIN',    '2026-11-24', '16:00', '17:00', 100000),
 (3, 2, 'CAPSULE', '2026-11-24', '17:30', '18:15',  50000);

-- ---------------- STAFF (recursive hierarchy, 4 levels) ----------------
INSERT INTO STAFF (Staff_ID, Staff_Name, Staff_Role, Contact, Supervisor_ID, User_ID) VALUES
 (1, 'Kavya Rao',      'SHOW_DIRECTOR',         '9800000001', NULL, 6),  -- head director
 (2, 'Arjun Mehta',    'SHOW_DIRECTOR',         '9800000002', 1,    NULL),
 (3, 'Dev Sharma',     'BACKSTAGE_COORDINATOR', '9800000003', 2,    7),
 (4, 'Sana Iqbal',     'BACKSTAGE_COORDINATOR', '9800000004', 1,    NULL),
 (5, 'Priya Nair',     'ASSISTANT_STYLIST',     '9800000005', 3,    NULL),
 (6, 'Rahul Verma',    'ASSISTANT_STYLIST',     '9800000006', 3,    NULL),
 (7, 'Anjali Gupta',   'ASSISTANT_STYLIST',     '9800000007', 4,    NULL);

-- ---------------- FACILITY ----------------
INSERT INTO FACILITY (Facility_ID, Facility_Name, Facility_Type, Venue_ID) VALUES
 (1, 'East Wing Lounge',  'BACKSTAGE_LOUNGE', 1),
 (2, 'Glam Bay A',        'HAIR_MAKEUP_BAY',  1),
 (3, 'Front Press Pit',   'PRESS_PIT',        1),
 (4, 'Green Room',        'BACKSTAGE_LOUNGE', 2),
 (5, 'Glam Bay B',        'HAIR_MAKEUP_BAY',  2),
 (6, 'Lawn Press Pit',    'PRESS_PIT',        3),
 (7, 'Courtyard Lounge',  'BACKSTAGE_LOUNGE', 3);

-- ---------------- MODEL ----------------
INSERT INTO MODEL (Model_ID, Model_Name, Agency, Contact, User_ID) VALUES
 (1, 'Tara Sethi',    'Elite Models India', '9700000001', 8),
 (2, 'Nikhil Joshi',  'Inega',              '9700000002', 9),
 (3, 'Zoya Khan',     'Anima Creative',     '9700000003', NULL),
 (4, 'Kabir Malhotra','Elite Models India', '9700000004', NULL),
 (5, 'Riya Bose',     'Inega',              '9700000005', NULL);

-- ---------------- USES (M:N with Usage_Date) ----------------
INSERT INTO USES (Model_ID, Facility_ID, Usage_Date) VALUES
 (1, 2, '2026-11-20'), (1, 1, '2026-11-20'), (2, 2, '2026-11-20'),
 (2, 5, '2026-11-22'), (3, 5, '2026-11-22'), (4, 7, '2026-11-24'),
 (5, 1, '2026-11-20');
