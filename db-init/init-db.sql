IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'webapp_db')
BEGIN
    CREATE DATABASE webapp_db;
END
GO

USE webapp_db;
GO

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'apidemo')
BEGIN
    CREATE LOGIN apidemo WITH PASSWORD = '$(API_DB_PASSWORD)', CHECK_EXPIRATION=OFF, CHECK_POLICY=ON;
END
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'apidemo')
BEGIN
    CREATE USER apidemo FOR LOGIN apidemo;
    ALTER ROLE db_datareader ADD MEMBER apidemo;
    ALTER ROLE db_datawriter ADD MEMBER apidemo;
END
GO
