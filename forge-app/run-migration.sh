#!/bin/bash

# Migration script for FORGE database
# This script runs the complete database schema migration

echo "🔧 Running FORGE database migration..."

# Check if we're in the correct directory
if [ ! -f "supabase/migrations/20260303_complete_schema.sql" ]; then
    echo "❌ Error: Please run this script from the forge-app directory"
    exit 1
fi

echo "📋 Available migrations:"
ls -la supabase/migrations/

echo ""
echo "⚠️  Manual migration required:"
echo "1. Go to your Supabase dashboard"
echo "2. Navigate to your database"
echo "3. Use the SQL editor to run the contents of:"
echo "   supabase/migrations/20260303_complete_schema.sql"
echo ""
echo "📝 OR use the Supabase CLI:"
echo "   supabase db reset --linked"
echo ""
echo "After running the migration, seed the database with:"
echo "   curl -X POST http://localhost:3000/api/seed"
echo ""
echo "✅ Migration script complete"