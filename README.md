# Aerie Part Management

[![Flask](https://img.shields.io/badge/Backend-Flask-blueviolet?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Vite](https://img.shields.io/badge/Frontend-Vite-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Onshape](https://img.shields.io/badge/Integration-Onshape-00B2FF?style=for-the-badge&logo=onshape)](https://www.onshape.com/)
[![FRC](https://img.shields.io/badge/FRC-3322-red?style=for-the-badge)](https://github.com/frc3322)

A clean, modern, and efficient part management system designed specifically for FRC teams. Built with a focus on simplicity, visual clarity, and seamless Onshape integration.

See the demo here! [https://aeriedemo.scytheengineering.com/](https://aeriedemo.scytheengineering.com/)

## ✨ Key Features

-   **Streamlined Workflow**: Move parts through a dedicated lifecycle: `Review` → `CNC/Hand Fab` → `Completed`.
-   **Onshape Integration**: Direct links and data synchronization with your Onshape CAD models.
-   **3D Visualization**: Built-in 3D viewer that automatically converts STEP files to GLB for in-browser inspection.
-   **Advanced Search**: Live filtering across subsystems, materials, assigned students, and part status.
-   **Secure & Simple**: API key-based authentication ensures your data is protected while remaining easy to set up.
-   **Responsive Design**: Manage your shop floor from any device—desktop, tablet, or mobile.

<img width="1512" height="787" alt="image" src="https://github.com/user-attachments/assets/59d875b9-5d47-4d15-bca8-f0971c61bddc" />

## Tech Stack

### Frontend

-   **Vanilla JS & Vite**: Lightweight and ultra-fast development.
-   **Three.js**: Powers the high-performance 3D part preview.
-   **Tailwind CSS**: Modern, responsive styling with a focus on usability.

### Backend

-   **Flask (Python)**: Robust and extensible RESTful API.
-   **SQLAlchemy**: Clean ORM for flexible database management (SQLite/PostgreSQL).
-   **uv**: Next-generation Python package management for lightning-fast setup.
-   **Cascadio**: Automatic STEP to GLB conversion engine.

## 🚀 Quick Start

### Prerequisites

-   [Python 3.12](https://www.python.org/)
-   [Node.js 16+](https://nodejs.org/)
-   [uv](https://github.com/astral-sh/uv) (Python package manager)

### Production Deployment

Run the complete application (backend + built frontend) on port 5000:

```bash
uv run backend/deploy.py prod-multi --port 5000
```

Then open your browser to `http://localhost:5000`.

### Development Mode

For active development with hot reloading:

1. **Start the Backend** (runs on port 6060):

    ```bash
    uv run backend/deploy.py dev --port 6060
    ```

2. **Start Frontend Dev Server** (runs on port 5173, proxies API to 6060):

    ```bash
    npm install
    npm run dev
    ```

3. **Access Development Server**:
   Open `http://localhost:5173` in your browser.

## 📖 Documentation

Comprehensive documentation is available in the [Wiki](../../wiki):

-   **[Installation Guide](../../wiki/Installation)** - Detailed setup instructions
-   **[Development Guide](../../wiki/Development)** - Contributing and local development
-   **[Deployment Guide](../../wiki/Deployment)** - Production deployment options
-   **[Configuration](../../wiki/Configuration)** - Environment variables and config options
-   **[API Reference](../../wiki/API-Reference)** - Complete API documentation

## 🔧 Configuration

The system can be configured using:

-   `config.json` file in the backend directory
-   Environment variables
-   Command-line arguments

See the [Configuration Guide](../../wiki/Configuration) in the wiki for details.

## 🤝 Contributing

We welcome contributions! Please see the [Development Guide](../../wiki/Development) for information on:

-   Setting up your development environment
-   Code structure and conventions
-   Submitting pull requests

## 📝 License

This project is licensed under the ISC License.

## 🏆 Credits

Built with ❤️ by **FRC Team 3322 (Eagle Evolution)**.

## 🆘 Support

-   Check the [Wiki](../../wiki) for documentation
-   Open an [Issue](../../issues) for bugs or feature requests
