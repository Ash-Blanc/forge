#!/bin/bash

# Database setup helper for FORGE
echo "🔧 FORGE Database Setup Helper"
echo "============================="

echo ""
echo "📋 Current Status Check:"
echo "1. Checking .env.local file..."
if [ -f "forge-app/.env.local" ]; then
    echo "   ✅ .env.local exists"
    echo "   📄 Contents:"
    grep -E "(SUPABASE|AWS)" forge-app/.env.local || echo "   ⚠️  No Supabase/AWS variables found"
else
    echo "   ❌ .env.local missing - create it first"
fi

echo ""
echo "2. Checking database tables..."
# This would need actual Supabase client to check, but we can provide instructions
echo "   🔍 To check tables:"
echo "   - Go to Supabase dashboard > Database > Tables"
echo "   - Look for 'analysis_sessions' table"

echo ""
echo "🚨 Common Issues & Solutions:"
echo "1. SSL Handshake Failed:"
echo "   Solution: Check NEXT_PUBLIC_SUPABASE_URL in .env.local"
echo ""
echo "2. Table 'analysis_sessions' not found:"
echo "   Solution: Run migration SQL from supabase/migrations/20260303_complete_schema.sql"
echo ""
echo "3. Invalid Supabase key:"
echo "   Solution: Ensure SUPABASE_SERVICE_ROLE_KEY starts with 'ey...' (JWT format)"
echo ""

echo "📝 Next Steps:"
echo "1. Ensure .env.local has proper Supabase credentials"
echo "2. Run migration in Supabase dashboard SQL editor"
echo "3. Sign in to the app and verify /api/sessions works"
echo "4. Test dashboard analysis flows"

echo ""
echo "✅ Setup helper complete"
