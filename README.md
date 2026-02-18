# EvaraTech Dashboard (Monorepo)

A high-performance water management dashboard with a React Frontend and Python (FastAPI) Backend.

## Structure
- **client/**: React + Vite + Tailwind CSS (Frontend)
- **server/**: Python + FastAPI + SQLAlchemy + Pandas (Backend)

## Quick Start
### Prerequisites
- Node.js & npm
- Python 3.10+ & pip

### Setup
Run this command from the root to install dependencies for both Client and Server:
```bash
npm run setup
```

### Running the App
Start both servers concurrently:
```bash
npm start
```
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Features
- **Intelligent Analytics**: Linear Regression for tank emptying prediction.
- **Real-Time**: WebSocket support for live updates.
- **Advanced Search**: In-Memory Inverted Index for O(1) location lookup.
- **Secure**: JWT Authentication and RBAC.

## Deployment
See `deployment.md` for Render deployment instructions.
