#!/bin/bash

echo "🚀 Starting Sympli Health..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "   Create it with your Supabase and OpenAI keys:"
    echo ""
    echo "   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo "   OPENAI_API_KEY=your_openai_key"
    echo ""
    echo "   Then run this script again."
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🌐 Starting development server..."
echo "   Local: http://localhost:3000"
echo "   Network: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "📱 To deploy and share:"
echo "   1. Push to GitHub: git push origin main"
echo "   2. Deploy on Vercel: https://vercel.com"
echo "   3. Share the URL!"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev 