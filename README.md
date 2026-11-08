# Hopkins Care Partner Connect

Secure, clinician-moderated knowledge exchange and peer support platform for Frontotemporal Dementia (FTD) care partners, featuring real-time clinical guidance, private clinician communication with Dr. Seema Gulyani, and regional support cohorts.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install frontend and backend dependencies
npm install
npm --prefix app install

# 2. Configure PostgreSQL and the backend
cp config/ftdcare.env.example config/ftdcare.env
# Edit config/ftdcare.env, then:
npm run backend:migrate
npm run backend:seed

# 3. Run the PostgreSQL backend and Vite frontend together
npm run dev

# Frontend: http://localhost:5173; backend health: http://localhost:3000/api/v1/health
```
