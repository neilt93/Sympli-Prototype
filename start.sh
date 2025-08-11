#!/bin/bash

# Sympli AI Health Companion - Launch Script

echo "🏥 Starting Sympli AI Health Companion..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Check for required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY environment variable not set."
    echo "   Please set your OpenAI API key:"
    echo "   export OPENAI_API_KEY='your-api-key-here'"
    echo ""
    echo "   Or create a .env file with:"
    echo "   OPENAI_API_KEY=your-api-key-here"
fi

# Check for MongoDB connection
if [ -z "$MONGO_URI" ]; then
    echo "⚠️  Warning: MONGO_URI environment variable not set."
    echo "   Using default local MongoDB: mongodb://localhost:27017/"
    echo "   To use MongoDB Atlas, set:"
    echo "   export MONGO_URI='mongodb+srv://username:password@cluster.mongodb.net/'"
fi

# Setup MongoDB (optional)
echo "🗄️  Setting up MongoDB..."
python setup_mongodb.py

# Launch the application
echo "🚀 Launching Sympli..."
echo "   The app will be available at: http://localhost:7860"
echo "   Press Ctrl+C to stop the server"
echo ""

python app.py 