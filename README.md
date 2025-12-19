# Aerie Part Management

[![FastAPI](https://img.shields.io/badge/Backend-Flask-blueviolet?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Vite](https://img.shields.io/badge/Frontend-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Onshape](https://img.shields.io/badge/Integration-Onshape-00B2FF?style=for-the-badge&logo=onshape)](https://www.onshape.com/)
[![FRC](https://img.shields.io/badge/FRC-3322-red?style=for-the-badge)](https://github.com/frc3322)

A clean, modern, and efficient part management system designed specifically for FRC teams. Built with a focus on simplicity, visual clarity, and seamless Onshape integration.

## ✨ Key Features

- **Streamlined Workflow**: Move parts through a dedicated lifecycle: `Review` → `CNC/Hand Fab` → `Completed`.
- **Onshape Integration**: Direct links and data synchronization with your Onshape CAD models.
- **3D Visualization**: Built-in 3D viewer that automatically converts STEP files to GLB for in-browser inspection.
- **Advanced Search**: Live filtering across subsystems, materials, assigned students, and part status.
- **Secure & Simple**: API key-based authentication ensures your data is protected while remaining easy to set up.
- **Responsive Design**: Manage your shop floor from any device—desktop, tablet, or mobile.

<img width="1512" height="787" alt="image" src="https://github.com/user-attachments/assets/59d875b9-5d47-4d15-bca8-f0971c61bddc" />

## Tech Stack

### Frontend
- **Vanilla JS & Vite**: Lightweight and ultra-fast development.
- **Three.js**: Powers the high-performance 3D part preview.
- **Tailwind CSS**: Modern, responsive styling with a focus on usability.

### Backend
- **Flask (Python)**: Robust and extensible RESTful API.
- **SQLAlchemy**: Clean ORM for flexible database management (SQLite/PostgreSQL).
- **uv**: Next-generation Python package management for lightning-fast setup.
- **Cascadio**: Automatic STEP to GLB conversion engine.

## 🚀 Getting Started

### Prerequisites
- [Python 3.8+](https://www.python.org/)
- [Node.js 16+](https://nodejs.org/)
- [uv](https://github.com/astral-sh/uv) (recommended for Python management)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/frc3322/part-management-system.git
   cd part-management-system
   ```

2. **Run Backend**
   ```bash
   cd backend
   uv pip install -r requirements.txt
   uv run python deploy.py prod-muli --port 3030
   ```

3. **Access the App**
   Open your browser and navigate to `http://localhost:3030`.

## 🛠️ Development

To contribute or develop the system:

1. **Start the Backend**
   Follow the same steps as in **Quick Setup** to run the backend service using `deploy.py`.

2. **Start Frontend Development Server**
   In a separate terminal, from the root directory, run:
   ```bash
   npm install
   npm run dev
   ```

3. **Development URL**
   The frontend development server will typically be available at `http://localhost:5173`.
---

Built with ❤️ by **FRC Team 3322 (Eagle Evolution)**.
