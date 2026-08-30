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

> [!NOTE]
> Architecture Diagram Placeholder
> *(Insert Architecture Diagram Image Here)*

---

## ✨ Key Features
- 📸 **AI Maternal Food & Nutrition Detection**: Real-time dietary recognition via camera or gallery using advanced Object Detection.
- 📊 **Daily Nutrient & Calorie Breakdown**: Automated tracking of maternal food intake and nutritional analysis.
- ❤️ **Maternal Wellness & Health Vitals Monitoring**: Keep track of essential health metrics seamlessly.
- 🥗 **Personalized Meal & Health Recommendations**: Tailored advice based on dietary habits and health status.
- 🎨 **Interactive & Accessible UI**: A user-friendly interface specifically designed for mothers.

---

## 🛠️ Tech Stack Breakdown

### Frontend
- **Framework**: React Native (Expo / CLI)
- **Styling**: Tailwind CSS (NativeWind)

### Backend
- **Runtime**: Node.js / Python
- **Framework**: FastAPI

### AI / Machine Learning
- **Model**: YOLO Object Detection Model (Custom trained for maternal food items)

### DevOps & Cloud
- **Containerization**: Docker
- **Cloud Deployment**: Render / Choreo
- **CI/CD**: Automated deployment pipelines

---

## 📁 Project Directory Structure
```text
maathru_care/
├── .github/                # GitHub Actions CI/CD workflows
├── backend/                # Backend API services (FastAPI/Node.js)
│   ├── app/                # Main application logic
│   ├── models/             # YOLO AI models and scripts
│   ├── Dockerfile          # Docker configuration for backend
│   └── requirements.txt    # Python dependencies
├── mobile/                 # React Native mobile application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── services/       # API integration services
│   │   └── utils/          # Helper functions
│   ├── package.json        # Node dependencies
│   └── tailwind.config.js  # NativeWind configuration
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- Docker
- React Native CLI / Expo CLI
- Git

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/maathru_care.git
   cd maathru_care
   ```

2. **Backend Setup (FastAPI)**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup (React Native)**
   ```bash
   cd ../mobile
   npm install
   # For Expo:
   npx expo start
   # For React Native CLI:
   npx react-native run-android # or run-ios
   ```

4. **Running with Docker (Recommended for Backend)**
   ```bash
   cd backend
   docker build -t maathru-backend .
   docker run -p 8000:8000 maathru-backend
   ```

---

## 🔌 API Contracts & Endpoints

| Endpoint | Method | Description | Request Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | System health check. | None | `{ "status": "ok" }` |
| `/predict`| `POST` | AI Food Detection & Nutrition Inference. | `multipart/form-data` (Image) | JSON with bounding boxes & nutritional data |

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

---

## 👥 Team Members

| Name | Student ID | Role / Module |
| :--- | :--- | :--- |
| NUWANTHA P.A.T. | IT22284716 | Lead AI & Computer Vision Integration / Full-Stack Mobile Engineer |
| [Name 2] | [ID 2] | [Role 2] |
| [Name 3] | [ID 3] | [Role 3] |
| [Name 4] | [ID 4] | [Role 4] |

---

## 📄 License & Acknowledgments
- Distributed under the MIT License. See `LICENSE` for more information.
- Special thanks to our supervisors and the open-source community for their invaluable tools and resources.
