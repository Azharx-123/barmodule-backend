# Barmodule Backend API

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Update environment variables

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user

### Courses
- GET /api/courses - Get all courses
- GET /api/courses/:slug - Get course by slug
- POST /api/courses - Create course (Admin)
- PUT /api/courses/:id - Update course (Admin)
- DELETE /api/courses/:id - Delete course (Admin)

### Quiz
- GET /api/quiz/course/:courseId - Get quiz by course
- POST /api/quiz/submit - Submit quiz
- GET /api/quiz/results - Get user results
- POST /api/quiz - Create/Update quiz (Admin)

### Contact
- POST /api/contact - Submit contact form
- GET /api/contact - Get all contacts (Admin)
- PUT /api/contact/:id - Update contact status (Admin)

### User
- POST /api/users/enroll - Enroll in course
- GET /api/users/profile - Get user profile

### Admin
- GET /api/admin/stats - Get dashboard statistics (Admin)