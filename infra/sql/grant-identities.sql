-- Creates the database users for the managed identities.
-- Run in the database sqldb-authex, signed in as a member of the SQL administrator group (Entra).
-- Names as in the Bicep outputs appIdentityName / migrationIdentityName.

-- App: read and write data only
IF DATABASE_PRINCIPAL_ID('id-authex-app') IS NULL
    CREATE USER [id-authex-app] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [id-authex-app];
ALTER ROLE db_datawriter ADD MEMBER [id-authex-app];

-- Migration: change the schema
IF DATABASE_PRINCIPAL_ID('id-authex-migrate') IS NULL
    CREATE USER [id-authex-migrate] FROM EXTERNAL PROVIDER;
ALTER ROLE db_ddladmin ADD MEMBER [id-authex-migrate];
ALTER ROLE db_datareader ADD MEMBER [id-authex-migrate];
ALTER ROLE db_datawriter ADD MEMBER [id-authex-migrate];
