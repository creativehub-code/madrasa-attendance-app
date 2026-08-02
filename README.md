# 📖 Madrasa Tracker

**Madrasa Tracker** is a full-stack MERN web application and Progressive Web App (PWA) designed to streamline Madrasa management, student academic progress tracking, Quran memorization (Hifz/Juzu) monitoring, teacher feedback, and parent reporting.

---

## 🚀 Tech Stack

### **Frontend**
* **Framework:** [Next.js 15](https://nextjs.org/) (App Router & React 19)
* **Language:** TypeScript
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **State & Data Fetching:** [TanStack React Query v5](https://tanstack.com/query)
* **Form & Validation:** React Hook Form + Zod
* **PWA Integration:** `@ducanh2912/next-pwa`
* **Icons & Notifications:** Lucide React, React Hot Toast

### **Backend**
* **Runtime:** Node.js (>= 18.0.0)
* **Framework:** [Express.js](https://expressjs.com/)
* **Database:** [MongoDB](https://www.mongodb.com/) via Mongoose ORM
* **Authentication:** JWT (JSON Web Tokens) with Bearer token header & bcryptjs password hashing
* **Security & Sanitization:** Helmet, express-rate-limit, express-mongo-sanitize, xss-clean
* **Validation:** Express-Validator & Zod

---

## ✨ Key Features

* 🔐 **Role-Based Access Control (RBAC):** Dedicated dashboards and scoped data access for **Admin**, **Teacher**, and **Parent** roles.
* 📖 **Quran Memorization Tracking:** Log and evaluate daily Juzu, Surah, Sabaq, and Sabqi progress with precision.
* 📊 **Parent Portal:** Parents can view real-time progress cards, evaluation metrics, attendance records, and teacher announcements for their children.
* 👨‍🏫 **Teacher Dashboard:** Quick student management, evaluation entry, performance history, and feedback dispatch.
* 📲 **Progressive Web App (PWA):** Fully responsive layout installable on mobile and desktop devices with offline caching capabilities.
* 🛡️ **Enterprise-Grade Security:** Input sanitization, rate-limiting, CORS configuration, and strict data isolation middleware.

---

## 📁 Repository Structure

```text
madrasa-tracker/
├── backend/                  # Node.js / Express API Server
│   ├── src/
│   │   ├── config/           # Database & Environment config
│   │   ├── controllers/      # Route controllers (Auth, Admin, Teacher, Parent)
│   │   ├── middleware/       # JWT Auth, RBAC, Data Isolation, Error Handling
│   │   ├── models/           # Mongoose Data Models (User, Student, Progress, etc.)
│   │   ├── routes/           # API Routes
│   │   ├── validators/       # Input validation schemas
│   │   └── server.js         # Express server entry point
│   ├── .env.example          # Backend Environment variable template
│   ├── .gitignore            # Backend Git ignore rules
│   └── package.json
├── frontend/                 # Next.js App Router Frontend
│   ├── src/                  # Components, Hooks, Services, Pages
│   ├── public/               # Static assets & PWA manifest
│   ├── .env.example          # Frontend Environment variable template
│   ├── .gitignore            # Frontend Git ignore rules
│   ├── next.config.js        # Next.js & PWA config
│   └── package.json
├── .gitignore                # Root Git ignore rules
└── README.md                 # Project Documentation
```

---

## 🛠️ Local Development Setup

### **Prerequisites**
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)
* **MongoDB** (Local instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

---

### **1. Clone the Repository**
```bash
git clone https://github.com/your-username/madrasa-tracker.git
cd madrasa-tracker
```

---

### **2. Backend Setup**

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the `backend/` root directory (or copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Update `.env` values as needed:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/madrasa
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   JWT_EXPIRES_IN=2h
   CLIENT_URL=http://localhost:3000
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

---

### **3. Frontend Setup**

1. Open a new terminal tab/window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the `frontend/` root directory:
   ```bash
   cp .env.example .env.local
   ```
   Ensure `.env.local` points to your backend server:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend application will be accessible at `http://localhost:3000`.

---

## 🧪 Production Build Commands

### **Frontend Build**
```bash
cd frontend
npm run build
npm start
```

### **Backend Production Launch**
```bash
cd backend
npm start
```

---

## 🔒 Security & Environment Safeguards

All environment configuration files (`.env`, `.env.local`, `.env.production`, etc.) are explicitly ignored across root, frontend, and backend directories to prevent sensitive credentials and secret keys from being committed to source control.

---

## 📄 License

This project is released under the [MIT License](LICENSE).
