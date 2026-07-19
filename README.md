# Internship Connect

Internship Connect is a full-stack web application for managing internship opportunities, applications, and user roles for students, recruiters, and administrators.

## Frontend

The frontend is a React + Vite application that provides the user interface for authentication, dashboards, job browsing, applications, and profile management.

### Features

- Student dashboard for browsing and applying to internships
- Recruiter dashboard for posting and managing jobs
- Admin dashboard for managing users, jobs, and applications
- Role-based access and authentication
- Persistent theme setting
- Resume/profile upload support

### Tech stack

- React 18
- Vite 4
- Axios
- React Icons

### Getting started

1. Open a terminal in the `Frontend` folder.
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open the local URL shown in the terminal, usually `http://localhost:5173`.

## Backend

The backend is a Node.js server that handles authentication, user management, job listings, applications, and API routes for the platform.

### Features

- User registration and login
- Role-based authorization
- Job and application management
- Recruiter and admin operations
- File upload support for resumes and profile data

### Tech stack

- Node.js
- Express
- CORS
- File upload handling

### Getting started

1. Open a terminal in the `Backend` folder.
2. Install dependencies:

```bash
npm install
```

3. Start the backend server:

```bash
node server.js
```

4. The backend API should be available at `http://localhost:5000/api` by default.

## Notes

- The frontend expects the backend API at `http://localhost:5000/api` unless configured otherwise.
- Make sure both the frontend and backend servers are running for full functionality.

## License

Copyright (C) 2025 JOSEPH MUKUKA. All rights reserved.
No permission is granted to use, copy, modify, or distribute this software or any portion of it for any purpose without explicit written consent.
