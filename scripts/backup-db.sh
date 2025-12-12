#!/bin/bash
# Backup script for SQLite database

BACKUP_DIR="database/backups"
DB_FILE="database/aula.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/aula-$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

# Create backup
echo "📦 Creating backup..."
cp $DB_FILE $BACKUP_FILE

# Compress backup
echo "🗜️  Compressing backup..."
gzip $BACKUP_FILE

echo "✅ Backup created: $BACKUP_FILE.gz"
echo "📊 Backup size: $(du -h $BACKUP_FILE.gz | cut -f1)"

# Keep only last 30 backups
echo "🧹 Cleaning old backups (keeping last 30)..."
ls -t $BACKUP_DIR/aula-*.db.gz | tail -n +31 | xargs -r rm

echo "✅ Backup complete!"
