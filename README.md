# 🎛️ Operations Hub & Media Dashboard

A full-stack control dashboard for real-time operations, container management, and system monitoring. Built with a responsive **React** frontend, a high-performance **Python** backend, real-time **WebSocket** streaming, and full **Docker** containerization.

---

## 🚀 Key Features

* **Real-time Monitoring:** Live system metrics, state updates, and logs streamed via WebSockets.
* **Container Controls:** Interface for managing and routing containerized services (Docker).
* **Modular Dashboard UI:** Interactive widgets, charts, and system status panels built with React.
* **REST & WebSocket API:** Python-powered backend delivering low-latency endpoints and event streams.
* **Containerized Deployment:** Fully environment-isolated setup using Docker & Docker Compose.

---

## 🛠️ Tech Stack

* **Frontend:** React, JavaScript (ES6+), CSS3 / HTML5
* **Backend:** Python (FastAPI / WebSockets / Asyncio)
* **Infrastructure & DevOps:** Docker, Docker Compose, Linux
* **Protocol:** WebSockets, REST API

---

## 📂 Project Structure

.
├── frontend/               # React client application
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # UI components & widgets
│   │   ├── hooks/          # Custom hooks (WebSocket connection, state)
│   │   ├── services/       # API integration & WebSocket handlers
│   │   └── App.js          # Root layout
│   └── package.json
├── backend/                # Python server & API services
│   ├── app/
│   │   ├── api/            # REST & WebSocket route handlers
│   │   ├── core/           # Business logic & container controls
│   │   └── main.py         # Application entrypoint
│   └── requirements.txt
├── docker-compose.yml      # Multi-container orchestration
├── Dockerfile              # Backend & Frontend build instructions
└── README.md

---

## ⚡ Quick Start

### Prerequisites

* Docker & Docker Compose
* Node.js (v18+) (for local frontend dev)
* Python (3.10+) (for local backend dev)

---

### Option 1: Run with Docker Compose (Recommended)

1. Clone the repository:
   git clone https://github.com/yourusername/operations-dashboard.git
   cd operations-dashboard

2. Launch the stack:
   docker-compose up -d --build

3. Access the applications:
   * Dashboard Frontend: http://localhost:3000
   * Backend API / WebSockets: http://localhost:8000

---

### Option 2: Local Development Setup

#### Backend Setup

cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

#### Frontend Setup

cd frontend
npm install
npm start

---

## 🔌 API & WebSockets

* GET /api/v1/status — Returns current system and container operational status.
* WS /ws/stream — WebSocket channel delivering real-time metric streams and updates to the frontend.

---

## 📜 License

Distributed under the MIT License.
