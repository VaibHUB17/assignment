# Lone Town Backend

A mindful dating platform backend built with Node.js, Express, MongoDB, and Socket.io.

## Concept

Lone Town is a dating platform focused on creating meaningful, exclusive connections:

- One exclusive match per user per day (no parallel dating)
- Matching based on deep compatibility (emotional, psychological, behavioral data)
- Matched users are pinned by default
- If unpinned:
   - The person who unpinned enters a 24-hour reflection freeze
   - The other user gets a new match in 2 hours and receives feedback on why it didn't work
- Video calling unlocks after 100 messages within 48 hours

## Features

- User registration with deep compatibility traits
- State management (`available`, `matched`, `frozen`, `waiting`)
- Daily match generation based on compatibility scoring
- Real-time messaging with Socket.io
- Video call unlocking based on engagement milestones
- Pin/unpin functionality with reflection periods
- State timing system for freeze and waiting periods
- Feedback mechanism for unmatched users

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Authentication**: JWT

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd lone-town-backend
```

2. Install dependencies:
```
npm install
```

3. Configure environment variables:
```
cp .env.example .env
# Edit .env with your MongoDB connection string and JWT secret
```

4. Start the server:
```
# Development mode
npm run dev

# Production mode
npm start
```