ALTER TABLE `User`
  ADD COLUMN `emailVerificationTokenExpiresAt` DATETIME(3) NULL;

SET @has_email_verification_token_column := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'User'
    AND COLUMN_NAME = 'emailVerificationToken'
);

SET @backfill_sql := IF(
  @has_email_verification_token_column > 0,
  'UPDATE `User`
   SET `emailVerificationTokenExpiresAt` = DATE_ADD(`createdAt`, INTERVAL 24 HOUR)
   WHERE `emailVerificationToken` IS NOT NULL
     AND `emailVerificationTokenExpiresAt` IS NULL',
  'SELECT 1'
);

PREPARE backfill_stmt FROM @backfill_sql;
EXECUTE backfill_stmt;
DEALLOCATE PREPARE backfill_stmt;
