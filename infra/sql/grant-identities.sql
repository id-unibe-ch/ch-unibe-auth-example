-- Datenbankbenutzer für die Managed Identities anlegen.
-- Ausführen in der Datenbank sqldb-authex, angemeldet als Mitglied der SQL-Administratorgruppe (Entra).
-- Namen gemäss Bicep-Ausgaben appIdentityName / migrationIdentityName.

-- App: nur Daten lesen und schreiben
IF DATABASE_PRINCIPAL_ID('id-authex-app') IS NULL
    CREATE USER [id-authex-app] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [id-authex-app];
ALTER ROLE db_datawriter ADD MEMBER [id-authex-app];

-- Migration: Schema ändern
IF DATABASE_PRINCIPAL_ID('id-authex-migrate') IS NULL
    CREATE USER [id-authex-migrate] FROM EXTERNAL PROVIDER;
ALTER ROLE db_ddladmin ADD MEMBER [id-authex-migrate];
ALTER ROLE db_datareader ADD MEMBER [id-authex-migrate];
ALTER ROLE db_datawriter ADD MEMBER [id-authex-migrate];
