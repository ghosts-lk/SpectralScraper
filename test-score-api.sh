#!/bin/bash
curl -s -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "id": "lead-1",
        "name": "Richard Garcia",
        "email": "rgarcia@google.com",
        "phone": "+1-201-233-8220",
        "title": "CTO",
        "company": "Google",
        "location": {"city": "Mountain View", "state": "CA"},
        "verified": true,
        "confidence": 0.95,
        "enrichmentLevel": "complete",
        "sources": ["linkedin", "company-website"],
        "socialProfiles": {"linkedin": "https://www.linkedin.com/in/richard-garcia"}
      }
    ]
  }' | jq '.' | head -50
