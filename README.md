<div align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge" alt="Build Status" />

  <h1>🤰 Maathru Care</h1>
  <p><b>AI-powered Maternal Healthcare, Nutrition Tracking & Wellness Support System</b></p>
</div>

<br />

## 📖 About the Project
Maathru Care is a comprehensive maternal healthcare mobile application designed to support expectant and postpartum mothers, as well as healthcare assistants. It leverages advanced Artificial Intelligence and Computer Vision to provide real-time dietary recognition, automated nutrient tracking, and personalized wellness recommendations, ensuring a healthy journey through motherhood.

---

## ✨ Key Features
- 📸 **AI Maternal Food & Nutrition Detection**: Real-time dietary recognition via camera or gallery using advanced Object Detection.
- 📊 **Daily Nutrient & Calorie Breakdown**: Automated tracking of maternal food intake and nutritional analysis.
- ❤️ **Maternal Wellness & Health Vitals Monitoring**: Keep track of essential health metrics seamlessly.
- 🥗 **Personalized Meal & Health Recommendations**: Tailored advice based on dietary habits and health status.
- 🎨 **Interactive & Accessible UI**: A user-friendly interface specifically designed for mothers.
- Mood-aware Sinhala/English support chatbot (consent-based camera + text mood sensing)

---

## 🛠️ Tech Stack Breakdown

### Frontend
- **Framework**: React Native (Expo / CLI)
- **Styling**: Tailwind CSS (NativeWind)

### Backend
- **Runtime**: Node.js / Python
- **Framework**: FastAPI
- **Auth & Database**: Supabase (Auth + Postgres)
- **Chatbot**: Node.js/Express, Python services, Groq LLM

### AI / Machine Learning
- **Model**: YOLO Object Detection Model (Custom trained for maternal food items)

### DevOps & Cloud
- **Containerization**: Docker
- **Cloud Deployment**: Render / Choreo
- **CI/CD**: Automated deployment pipelines

---

## 📁 Project Directory Structure
```text
MathruCare/
├── .github/workflows/      # CI for the chatbot backend
├── maathru-care/           # Expo (React Native) app — see maathru-care/README.md
└── chatbot/                # Mood-aware chatbot — see chatbot/README.md
    ├── backend/            # Node.js/Express API
    ├── services/           # Python services: fer, sentiment, fusion
    ├── packages/fusion-core/
    ├── ml/                 # Model development
    └── docs/               # Chatbot documentation
```

- App: [maathru-care/README.md](maathru-care/README.md)
- Chatbot: [chatbot/README.md](chatbot/README.md)

---

## 🚀 Getting Started

### Prerequisites
- Node.js
- Docker (for the chatbot backend)
- Git

### Installation & Setup

1. **Run the app**
   ```bash
   cd maathru-care
   npm install
   npm run web
   ```
   Copy `maathru-care/.env.example` to `maathru-care/.env` first. See
   [maathru-care/README.md](maathru-care/README.md).

2. **Run the chatbot backend** (optional; the app works in mock mode without it)
   ```bash
   cd chatbot
   cp .env.example .env   # then fill it in
   docker compose up -d --build
   docker compose exec -T backend node dist/db/migrate.js   # first run only
   ```
   See [chatbot/README.md](chatbot/README.md).

3. **Food-detection API (FastAPI/YOLO)** — maintained separately. Its URL is set in
   `maathru-care/src/services/api/foodDetector.ts`.

---

## 🔌 API Contracts & Endpoints

| Endpoint | Method | Description | Request Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | System health check. | None | `{ "status": "ok" }` |
| `/predict`| `POST` | AI Food Detection & Nutrition Inference. | `multipart/form-data` (Image) | JSON with bounding boxes & nutritional data |

Chatbot endpoints are documented in [chatbot/README.md](chatbot/README.md).

---

## 🧑‍💻 Individual Contributor Profile

### NUWANTHA P.A.T.
- **Student ID**: IT22284716
- **University Email**: [it22284716@my.sliit.lk](mailto:it22284716@my.sliit.lk)
- **Personal Email**: [tharindunuwantha77@gmail.com](mailto:tharindunuwantha77@gmail.com)
- **Role**: Lead AI & Computer Vision Integration / Full-Stack Mobile Engineer

#### Detailed Module Responsibilities:
1. **AI Food Detection Engine**: Trained and integrated custom YOLO object detection models optimized for identifying maternal meal items and conducting portion analysis.
2. **Backend & API Services**: Developed and containerized high-performance REST APIs utilizing FastAPI and Docker, achieving sub-second image inference and processing times.
3. **Cloud Infrastructure & CI/CD**: Architected automated continuous deployment pipelines using Docker, Render, and Choreo, incorporating robust health monitoring mechanisms.
4. **Mobile Integration**: Built seamless, responsive React Native interfaces facilitating real-time camera capture, image upload, bounding-box visualization, and comprehensive nutritional summaries.

### LIVERA S.D
- **Student ID**: IT22638168
- **Role**: Mood-aware Conversational Support Component

#### Detailed Module Responsibilities:
1. **Mood Models**: Facial expression recognition (MobileNetV2, TFLite) and Sinhala/English sentiment (SinBERT) models.
2. **Fusion Engine**: Transparent late-fusion mood engine.
3. **Chatbot Backend**: Node/Express chatbot backend with a deterministic safety layer and LLM integration.
4. **App Integration**: Consent-based chat UI integrated into Maathru Care.

---

## 👥 Team Members

| Name | Student ID | Role / Module |
| :--- | :--- | :--- |
| NUWANTHA P.A.T. | IT22284716 | Lead AI & Computer Vision Integration / Full-Stack Mobile Engineer |
| LIVERA S.D | IT22638168 | Mood-aware Conversational Support (Chatbot) |
| [Name 3] | [ID 3] | [Role 3] |
| [Name 4] | [ID 4] | [Role 4] |

---

## 📄 License & Acknowledgments
- Distributed under the MIT License. See `LICENSE` for more information.
- Special thanks to our supervisors and the open-source community for their invaluable tools and resources.
