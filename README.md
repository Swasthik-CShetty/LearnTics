# LearnTics

LearnTics is a short-form learning platform built for students, teachers, and admins. Teachers can upload lesson videos as individual reels or full topic playlists, students can browse topic-based content and track progress, and admins can manage teacher verification and platform operations.

## Features

- Role-based authentication for `student`, `teacher`, and `admin`
- Email verification and password reset flows
- Teacher verification workflow before publishing teaching content
- Upload single lesson reels or multi-lesson course playlists
- Topic-based learning feed for students
- Draft, published, and scheduled content states
- Likes, comments, saved topics, notifications, and progress tracking
- Admin dashboard and teacher/content management flows
- Cloudinary-based video storage support

## Tech Stack

### Frontend

- React 19
- Vite
- React Router
- Axios

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- bcrypt for password hashing
- Nodemailer for email flows
- Cloudinary + Multer for media uploads

## Project Structure

```text
pjt/
|-- client/                 # React + Vite frontend
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- api/
|   |   `-- utils/
|-- learntics/
|   `-- server/             # Express backend
|       |-- config/
|       |-- controllers/
|       |-- middleware/
|       |-- models/
|       |-- routes/
|       `-- services/
`-- README.md
```

## Main User Flows

### Students

- Register and verify email
- Browse the learning feed
- Open topic pages and follow lesson playlists
- Like, comment, save topics, and track progress
- Manage profile and settings

### Teachers

- Register as a teacher
- Wait for admin verification
- Upload reels or course playlists
- Organize content by topic
- Save content as draft, publish immediately, or schedule publication
- Manage existing uploaded content

### Admins

- Sign in through the admin login flow
- Review teacher accounts
- Approve verified teachers
- Access admin dashboard and moderation-related features

## Environment Variables

### Frontend: `client/.env`

Use `client/.env.example` as the base:

```env
VITE_API_URL=http://localhost:5000/api
```

### Backend: `learntics/server/.env`

Use `learntics/server/.env.example` as the base:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/learntics
JWT_SECRET=change_me
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

ADMIN_NAME=Admin
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=adminpassword

PLATFORM_NAME=LearnTics
EMAIL_FROM=LearnTics <no-reply@example.com>
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

## Installation

### 1. Install frontend dependencies

```bash
cd client
npm install
```

### 2. Install backend dependencies

```bash
cd learntics/server
npm install
```

### 3. Configure environment files

- Create `client/.env` from `client/.env.example`
- Create `learntics/server/.env` from `learntics/server/.env.example`

### 4. Start the backend

```bash
cd learntics/server
npm run dev
```

The API will start on `http://localhost:5000`.

### 5. Start the frontend

```bash
cd client
npm run dev
```

The app will start on `http://localhost:5173`.

## Available Scripts

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

### Backend

```bash
npm run dev
npm start
```

## API Surface

The backend currently exposes routes under:

- `/api/auth`
- `/api/reels`
- `/api/topic`
- `/api/comment`
- `/api/like`
- `/api/admin`
- `/api/progress`
- `/api/saved-topics`
- `/api/notifications`
- `/api/health`

## Notes

- The backend bootstraps an admin user from the configured admin environment variables on startup.
- Student-facing content only shows published items, including scheduled content whose publish time has passed.
- Teacher uploads require Cloudinary to be configured for media handling.
- Email verification and password reset flows require SMTP configuration.

## Future Improvements

- Add automated tests for critical auth and content flows
- Add API documentation with request/response examples
- Add deployment instructions for production
- Add screenshots or demo GIFs for the major user flows

## License

This project is currently private and does not yet define a public license.
