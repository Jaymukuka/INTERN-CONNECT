# Internship Connect Frontend

A React + Vite frontend for the Internship Connect application.

This frontend supports authentication, role-based dashboards, job listings, applications, and profile management for students, recruiters, and administrators.

## Features

- Student view
  - Browse and filter internship opportunities
  - Apply to jobs with a cover letter
  - View application status and notifications
  - Upload resume/profile data
- Recruiter view
  - Create and manage job postings
  - View applications for posted jobs
  - Update application statuses
  - Dashboard analytics and quick actions
- Admin view
  - View users, jobs, and applications
  - Search and filter records
  - Delete users and jobs
  - Update application statuses
- Persistent theme setting (light / dark)
- Auto-login support when token and user data are stored locally

## Tech stack

- React 18
- Vite 4
- Axios for HTTP requests
- React Icons for UI icons

## Prerequisites

- Node.js 18+ installed
- NPM or Yarn available
- Backend server running and reachable at `http://localhost:5000/api`

> The frontend expects the backend API to be available at `http://localhost:5000/api` by default.

## Getting started

1. Open a terminal in `internship-connect/Frontend`
2. Install dependencies:

```bash
npm install
```

3. Start the frontend development server:

```bash
npm run dev
```

4. Open the provided local URL (usually `http://localhost:5173`) in your browser.

## Available scripts

- `npm run dev` - start the Vite development server
- `npm run build` - build the production bundle
- `npm run preview` - preview the production build locally

## API configuration

The frontend is configured to call the backend API from `src/services/api.js`:

```js
const API_BASE_URL = "http://localhost:5000/api";
```

If your backend runs on a different host or port, update `API_BASE_URL` accordingly.

## Project structure

- `src/App.jsx` - application root and role-based dashboard routing
- `src/main.jsx` - React entry point
- `src/components/` - reusable dashboard and login components
- `src/services/api.js` - Axios client and API helpers
- `src/App.css` - base application styles

## Authentication and roles

Users can register and login as one of the following types:

- `student`
- `organization` (recruiter)
- `admin`

Registration includes role-specific fields, such as student program and university details or recruiter company and industry information.

## Notes

- If you see `401 Unauthorized`, the frontend clears stored auth data and redirects to the login page.
- Resume upload uses the `userAPI.uploadResume` endpoint if available; otherwise it falls back to a local preview.
- Student job recommendations are loaded from `/jobs/recommended` when available.

## Troubleshooting

- Ensure the backend server is running before using the frontend.
- Confirm the backend API path matches `API_BASE_URL`.
- Clear browser local storage if login or stale data issues occur.

## License

Does not contain any licence

Copyright (C) 2025 JOSEPH MUKUKA. All rights reserved.
No permission is granted to use, copy, modify, or distribute this software or any portion of it for any purpose without explicit written consent.
