# DSY MERN Prescription Platform - Backend

Backend API for the online prescription and consultation platform built using Node.js, Express.js, and MongoDB.

---

# Features

## Authentication
- Doctor Signup/Login
- Patient Signup/Login
- JWT Authentication
- Role Based Authorization

## Doctor Features
- View Consultation Requests
- Create Prescription
- Update Prescription
- Generate PDF Prescription
- Dashboard Analytics

## Patient Features
- Submit Consultation Request
- View Consultations
- Download Prescriptions

## Additional Features
- PDF Generation
- Image Upload via Base64
- Dashboard Statistics APIs
- MongoDB Database Integration

---

# Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- PDFKit
- Morgan
- CORS

---

# Installation

## Clone Repository

```bash
git clone https://github.com/DevanshYadav9323/dsy-mern-prescription-backend.git
```

---

## Install Dependencies

```bash
npm install
```

---

# Environment Variables

Create `.env` file.

```env
export MONGO_URI=your_mongodb_connection_url
export JWT_SECRET=your_secret_key
```

---

# Run Development Server

```bash
npm run dev
```

---

# Run Production Server

```bash
npm start
```

---

# API Routes

# Doctor Routes

| Method | Route | Description |
|---|---|---|
| POST | `/doctor/signup` | Doctor Signup |
| POST | `/doctor/signin` | Doctor Login |
| GET | `/doctor/list` | Doctors Listing |
| GET | `/doctor/profile` | Doctor Profile |

---

# Patient Routes

| Method | Route | Description |
|---|---|---|
| POST | `/patient/signup` | Patient Signup |
| POST | `/patient/signin` | Patient Login |
| GET | `/patient/profile` | Patient Profile |

---

# Consultation Routes

| Method | Route | Description |
|---|---|---|
| POST | `/consultation/create` | Create Consultation |
| GET | `/consultation/doctor` | Doctor Consultations |
| GET | `/consultation/my-consultations` | Patient Consultations |

---

# Prescription Routes

| Method | Route | Description |
|---|---|---|
| POST | `/prescription/create` | Create Prescription |
| PUT | `/prescription/update/:id` | Update Prescription |
| GET | `/prescription/doctor` | Doctor Prescriptions |
| GET | `/consultation/my-prescriptions` | Patient Prescriptions |

---

# Dashboard Routes

| Method | Route | Description |
|---|---|---|
| GET | `/dashboard/doctor` | Doctor Dashboard Data |

---

# PDF Functionality

- Prescription PDFs are generated dynamically
- PDFs are stored in `/uploads`
- Doctors can regenerate updated prescriptions
- Existing PDFs are replaced on update

---

# Authentication

JWT based authentication used.

Protected routes:
- Doctor routes use `authenticateDoctor`
- Patient routes use `authenticatePatient`

---

# Deployment

Backend can be deployed on:
- Render
- Railway
- VPS

---

# Author

Devansh Yadav
