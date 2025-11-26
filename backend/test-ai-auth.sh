#!/bin/bash

# Test AI endpoints with authentication
# First login, then use the token for AI requests

echo "=== Testing AI Endpoints with Authentication ==="
echo ""

# Step 1: Login (replace with your actual credentials)
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }')

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Please check your credentials."
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."
echo ""

# Step 2: Test AI Content Generation
echo "Step 2: Testing AI Content Generation..."
AI_RESPONSE=$(curl -s -X POST http://localhost:5000/api/ai/generate-content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "topic": "Benefits of morning exercise",
    "tone": "friendly",
    "length": "short"
  }')

echo "AI Response:"
echo "$AI_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$AI_RESPONSE"
echo ""

# Step 3: Check AI Usage
echo "Step 3: Checking AI Usage Stats..."
USAGE_RESPONSE=$(curl -s -X GET http://localhost:5000/api/ai/usage \
  -H "Authorization: Bearer $TOKEN")

echo "Usage Stats:"
echo "$USAGE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$USAGE_RESPONSE"
echo ""

echo "=== Test Complete ==="
