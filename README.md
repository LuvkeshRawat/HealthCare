# HealthCare+ Project

HealthCare+ is a full-stack hospital management demo built with `Node.js`, `Express`, `MongoDB`, and vanilla `HTML`, `CSS`, and `JavaScript`. It provides separate dashboards for patients, doctors, and administrators to manage appointments, prescriptions, notices, and basic reporting from a single app.

## Features

- Landing page with healthcare platform overview
- Role-based login for `patient`, `doctor`, and `admin`
- Patient dashboard to:
  - book appointments
  - view assigned doctors
  - track prescriptions
  - read notices and upcoming visits
- Doctor dashboard to:
  - view appointments
  - manage patient queue
  - save prescription notes
  - read admin notices
- Admin dashboard to:
  - add doctors
  - send notices by role
  - monitor platform statistics
  - generate summary reports
- MongoDB-backed storage for appointments, prescriptions, doctors, and notices
- Seeded doctor accounts on server startup

## Tech Stack

- Frontend: `HTML`, `CSS`, `JavaScript`
- Backend: `Node.js`, `Express`
- Database: `MongoDB Atlas` with `Mongoose`

## Project Structure

```text
HealthCare-Project/
├── backend/
│   ├── package.json
│   └── server.js
└── frontend/
    ├── index.html
    ├── style.css
    ├── script.js
    ├── login/
    ├── patient/
    ├── doctor/
    └── admin/
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name/HealthCare-Project
```

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Start the server

```bash
npm start
```

The app will run at:

```text
http://localhost:3000
```

## Demo Login Credentials

### Patient

- Username: `patient`
- Password: `123`

### Admin

- Username: `admin`
- Password: `123`

### Doctor

Seeded doctor logins are available automatically when the server starts:

- `drsharma / 123`
- `drkhan / 123`
- `drmehta / 123`

New doctors added from the admin dashboard also receive a generated username and default password:

- Password: `123`

## Available Routes

### Frontend Pages

- `/` - Landing page
- `/login` - Login page
- `/patient` - Patient dashboard
- `/doctor` - Doctor dashboard
- `/admin` - Admin dashboard

### API Endpoints

- `POST /login` - Authenticate patient, doctor, or admin
- `POST /book-appointment` - Create a new appointment
- `GET /appointments` - Fetch all appointments
- `POST /prescriptions` - Save prescription notes
- `GET /prescriptions` - Fetch prescriptions
- `GET /doctors` - Fetch all doctors
- `POST /doctors` - Add a doctor
- `GET /notices` - Fetch notices by role
- `POST /notices` - Create a notice
- `GET /admin-stats` - Admin dashboard stats
- `GET /admin-reports` - Admin reporting data

## How It Works

1. Users log in from the shared login page.
2. Patients can book appointments with available doctors.
3. Doctors can view their appointments and add prescription notes for patients.
4. Admins can add doctors, broadcast notices, and review reports and usage stats.

## Notes

- The backend currently connects to MongoDB using a hardcoded connection string in `backend/server.js`.
- For a production-ready GitHub project, move the database URI into environment variables such as `.env`.
- The `backend/node_modules` folder is present locally but should usually be excluded from Git with `.gitignore`.

## Future Improvements

- Add JWT or session-based authentication
- Hash passwords instead of storing plain text credentials
- Move secrets to environment variables
- Add appointment cancellation and status updates
- Add validation, tests, and better error handling
- Deploy frontend and backend separately

## License

This project is available for learning and personal use.
