@echo off
REM Backup script for SQLite database (Windows)

set BACKUP_DIR=database\backups
set DB_FILE=database\aula.db
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\aula-%TIMESTAMP%.db

REM Create backup directory if it doesn't exist
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

REM Check if database exists
if not exist %DB_FILE% (
    echo ❌ Database file not found: %DB_FILE%
    exit /b 1
)

REM Create backup
echo 📦 Creating backup...
copy %DB_FILE% %BACKUP_FILE%

echo ✅ Backup created: %BACKUP_FILE%

REM Note: Windows doesn't have built-in gzip, so we skip compression
REM You can install 7-Zip and use: 7z a -tgzip %BACKUP_FILE%.gz %BACKUP_FILE%

echo ✅ Backup complete!
pause
