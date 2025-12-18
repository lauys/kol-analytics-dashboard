-- Clear all mock/sample data from database
-- Run this script to remove initial test data

-- Delete all snapshots first (due to foreign key constraint)
DELETE FROM snapshots;

-- Delete all KOLs
DELETE FROM kols;

-- Verify deletion
SELECT 'Cleared all data. KOLs count: ' || COUNT(*) as status FROM kols;
SELECT 'Snapshots count: ' || COUNT(*) as status FROM snapshots;
