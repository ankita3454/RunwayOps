-- =====================================================================
-- 06_alter_drop_demo.sql  -- run live in the demo to show ALTER and DROP
-- Safe to run more than once; leaves the schema as it was.
-- =====================================================================
USE runwayops;

-- ALTER: add a column with a default + CHECK, use it, then remove it
ALTER TABLE COLLECTION
    ADD COLUMN Look_Count INT NOT NULL DEFAULT 20,
    ADD CONSTRAINT chk_look_count CHECK (Look_Count BETWEEN 1 AND 80);

UPDATE COLLECTION SET Look_Count = 35 WHERE Collection_ID = 1;
SELECT Collection_ID, Collection_Name, Look_Count FROM COLLECTION;

ALTER TABLE COLLECTION
    DROP CHECK chk_look_count,
    DROP COLUMN Look_Count;

-- ALTER: change a column definition (widen agency name)
ALTER TABLE MODEL MODIFY Agency VARCHAR(150) NOT NULL;

-- ALTER: add and drop an index
ALTER TABLE MODEL ADD INDEX idx_model_agency (Agency);
SHOW INDEX FROM MODEL;
ALTER TABLE MODEL DROP INDEX idx_model_agency;

-- DROP: a temporary table and a temporary view
CREATE TABLE TEMP_PRESS_LIST (Press_ID INT PRIMARY KEY, Outlet VARCHAR(100));
CREATE OR REPLACE VIEW v_temp_finale AS
    SELECT * FROM RUNWAY_SEGMENT WHERE Segment_Type = 'FINALE';
SELECT * FROM v_temp_finale;
DROP VIEW  v_temp_finale;
DROP TABLE TEMP_PRESS_LIST;
