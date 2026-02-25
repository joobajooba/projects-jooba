-- Verify the test insert worked
SELECT * FROM "public"."users" WHERE wallet_address = '0xtest123';

-- If you see the row, RLS is working correctly!
-- Delete the test row after verifying
DELETE FROM "public"."users" WHERE wallet_address = '0xtest123';
