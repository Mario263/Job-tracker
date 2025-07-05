#!/bin/bash

echo "Starting Job Tracker Cloud-Only Development Environment..."

# Kill any existing processes on ports 3001 and 8080
echo "🧹 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Wait a moment for ports to be freed
sleep 2

# Check if we're in development
if [ "$NODE_ENV" != "production" ]; then
    echo "🔧 Development mode - starting cloud-only servers..."
    
    # Start backend server first
    echo "📡 Starting backend server on port 3001..."
    cd backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing backend dependencies..."
        npm install
    fi
    
    # Check if .env file exists and has MongoDB URI
    if [ ! -f ".env" ]; then
        echo "❌ .env file not found!"
        echo "Please create a .env file with your MongoDB Cloud connection string:"
        echo "MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database"
        echo "NODE_ENV=development"
        echo "PORT=3001"
        exit 1
    fi
    
    # Verify MongoDB URI exists
    if ! grep -q "MONGODB_URI" .env; then
        echo "❌ MONGODB_URI not found in .env file!"
        echo "Please add your MongoDB Cloud connection string to the .env file."
        exit 1
    fi
    
    # Start backend in background
    echo "🚀 Starting cloud-only backend API server..."
    npm start &
    BACKEND_PID=$!
    
    # Wait for backend to start
    echo "⏳ Waiting for backend to initialize..."
    sleep 5
    
    # Test backend health with retry logic
    echo "🏥 Testing backend health..."
    BACKEND_READY=false
    for i in {1..10}; do
        # Check if the port is open and health endpoint responds
        if nc -z localhost 3001 2>/dev/null; then
            HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health 2>/dev/null)
            if [ $? -eq 0 ] && echo "$HEALTH_RESPONSE" | grep -q "status"; then
                echo "✅ Backend is healthy and ready!"
                echo "📋 Health status: $HEALTH_RESPONSE"
                BACKEND_READY=true
                break
            fi
        fi
        echo "⏳ Backend not ready yet (attempt $i/10)..."
        sleep 2
    done
    
    if [ "$BACKEND_READY" = false ]; then
        echo "❌ Backend failed to start properly."
        echo "⚠️  This could be due to:"
        echo "   - MongoDB connection issues (check your .env file)"
        echo "   - Invalid MongoDB URI format"
        echo "   - Network connectivity issues"
        echo "   - Port 3001 already in use"
        echo "❌ Application cannot run without cloud database connection!"
        exit 1
    fi
    
    # Return to root directory
    cd ..
    
    # Start frontend server
    echo "🌐 Starting frontend server on port 8080..."
    cd JTS
    
    # Check if we can use Python 3
    if command -v python3 &> /dev/null; then
        echo "📱 Using Python 3 HTTP server..."
        python3 -m http.server 8080 &
        FRONTEND_PID=$!
    elif command -v python &> /dev/null; then
        echo "📱 Using Python 2 HTTP server..."
        python -m SimpleHTTPServer 8080 &
        FRONTEND_PID=$!
    else
        echo "⚠️  Python not found. Trying Node.js server..."
        if command -v npx &> /dev/null; then
            npx serve . -p 8080 &
            FRONTEND_PID=$!
        else
            echo "❌ No suitable HTTP server found. Please install Python or Node.js"
            exit 1
        fi
    fi
    
    # Wait for frontend to start
    sleep 3
    
    cd ..
    
    echo ""
    echo "🎉 Job Tracker Cloud-Only is running!"
    echo "==============================================="
    echo "📱 Frontend:     http://localhost:8080"
    echo "🔐 Sign In/Up:   http://localhost:8080/signin.html"
    echo "🔧 Backend API:  http://localhost:3001"
    echo "🏥 Health Check: http://localhost:3001/api/health"
    echo "🔑 Auth API:     http://localhost:3001/api/auth"
    echo "📊 Applications: http://localhost:3001/api/applications"
    echo "👥 Contacts:     http://localhost:3001/api/contacts"
    echo "📄 Resumes:      http://localhost:3001/api/resumes"
    echo "==============================================="
    echo ""
    echo "🔐 Multi-User Authentication Enabled!"
    echo "☁️ Cloud-only mode: All data is saved to MongoDB"
    
    echo ""
    echo "💡 Tips:"
    echo "   - Open http://localhost:8080 to access the main application"
    echo "   - First-time users: Go to http://localhost:8080/signin.html to create an account"
    echo "   - Each user gets their own private data (applications, contacts, resumes)"
    echo "   - Install Chrome extension from /chrome-extension for enhanced features"
    echo "   - All data is stored securely in MongoDB cloud with authentication"
    echo "   - Check backend logs if API calls fail"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    
    # Function to cleanup on exit
    cleanup() {
        echo ""
        echo "🛑 Stopping servers..."
        if [ ! -z "$BACKEND_PID" ]; then
            kill $BACKEND_PID 2>/dev/null || true
        fi
        if [ ! -z "$FRONTEND_PID" ]; then
            kill $FRONTEND_PID 2>/dev/null || true
        fi
        # Kill any remaining processes on our ports
        lsof -ti:3001 | xargs kill -9 2>/dev/null || true
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
        echo "✅ Cleanup complete"
        exit 0
    }
    
    # Set up signal handlers
    trap cleanup INT TERM
    
    # Wait for user to stop (this keeps the script running)
    while true; do
        sleep 1
        
        # Check if backend is still running
        if [ ! -z "$BACKEND_PID" ] && ! kill -0 $BACKEND_PID 2>/dev/null; then
            echo "⚠️  Backend process stopped unexpectedly"
            BACKEND_PID=""
        fi
        
        # Check if frontend is still running
        if [ ! -z "$FRONTEND_PID" ] && ! kill -0 $FRONTEND_PID 2>/dev/null; then
            echo "⚠️  Frontend process stopped unexpectedly"
            FRONTEND_PID=""
        fi
    done
    
else
    echo "🚀 Production mode detected"
    echo "💡 Deploy to Vercel or your preferred cloud platform"
    echo "Make sure to set MONGODB_URI environment variable in production"
fi