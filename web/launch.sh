#!/bin/bash

# Qwiken Website Launch Script
echo "🚀 Starting Qwiken Website..."
echo "================================"

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found"
    echo "🌐 Starting local server at http://localhost:8000"
    echo "📱 Visit the website in your browser"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "================================"
    
    # Start Python HTTP server
    python3 -m http.server 8000
    
elif command -v python &> /dev/null; then
    echo "✅ Python found"
    echo "🌐 Starting local server at http://localhost:8000"
    echo "📱 Visit the website in your browser"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "================================"
    
    # Start Python HTTP server (Python 2 fallback)
    python -m SimpleHTTPServer 8000
    
elif command -v node &> /dev/null; then
    echo "✅ Node.js found"
    
    # Check if http-server is installed
    if command -v npx &> /dev/null; then
        echo "🌐 Starting local server at http://localhost:8000"
        echo "📱 Visit the website in your browser"
        echo ""
        echo "Press Ctrl+C to stop the server"
        echo "================================"
        
        # Start using npx http-server
        npx http-server -p 8000 -o
    else
        echo "❌ npx not found. Please install Node.js or Python"
        exit 1
    fi
    
else
    echo "❌ No suitable server found."
    echo "Please install one of the following:"
    echo "- Python 3: https://python.org"
    echo "- Node.js: https://nodejs.org"
    echo ""
    echo "Or open index.html directly in your browser"
    exit 1
fi