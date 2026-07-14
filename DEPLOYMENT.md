# Resort Management System - Deployment Guide

This guide covers deploying the backend API using Docker and the two Next.js frontends (Guest Portal and Staff Dashboard) using Vercel.

## 1. Backend & Database Deployment (Docker)

The backend is built in Go (Fiber) and uses PostgreSQL for persistence. The easiest way to run this on a server (e.g., DigitalOcean, AWS EC2, or Hetzner) is via Docker Compose.

### Prerequisites
- A Linux server with **Docker** and **Docker Compose** installed.
- Git installed.

### Steps
1. **Clone the Repository**
   SSH into your server and clone your GitHub repository:
   ```bash
   git clone <your-repo-url>
   cd "Resort Management System"
   ```

2. **Configure Secrets**
   Open `docker-compose.yml` and change the `JWT_SECRET` and `POSTGRES_PASSWORD` to secure values.

3. **Start the Services**
   Run the following command to build and start the API and Database in detached mode:
   ```bash
   docker-compose up -d --build
   ```

4. **Verify**
   Check the logs to ensure the server started and migrated the database:
   ```bash
   docker-compose logs -f api
   ```
   You should see `Seeded default staff_admin user.` 

5. **Exposing the API**
   By default, the API runs on port `8080`. You should set up a reverse proxy like **Nginx** or **Caddy** with an SSL certificate (via Let's Encrypt) to map `api.yourdomain.com` to `localhost:8080`.

---

## 2. Frontend Deployment (Vercel)

Both `guest-portal` and `staff-dashboard` are Next.js applications and can be hosted seamlessly on Vercel for free or on a Pro plan.

### Steps
1. Create a free account at [Vercel.com](https://vercel.com).
2. Connect your GitHub account.
3. Click **Add New Project**.
4. Import your repository.
5. **Important**: Since this is a monorepo, you must deploy each frontend as a separate project.

#### Deploying Guest Portal
- In the Vercel Import screen, set the **Root Directory** to `guest-portal`.
- Keep the Framework Preset as `Next.js`.
- Add Environment Variables:
  - `NEXT_PUBLIC_API_URL` (if needed, e.g., pointing to your new backend URL)
  - `RESEND_API_KEY` (Required for the E-Bill feature. Get this from your [Resend dashboard](https://resend.com/))
- Click **Deploy**.

#### Deploying Staff Dashboard
- Go back to Vercel dashboard and click **Add New Project** again.
- Import the same repository.
- Set the **Root Directory** to `staff-dashboard`.
- Keep the Framework Preset as `Next.js`.
- Click **Deploy**.

### Updating the Frontend to point to the Production API
In both frontends (`src/lib/api.ts`), the `BASE_URL` is hardcoded to `http://localhost:8080/api/v1`. 
Before deploying to production, update this variable to point to your live backend domain (e.g., `https://api.yourdomain.com/api/v1`). 
Alternatively, use environment variables (`process.env.NEXT_PUBLIC_API_URL`).

---

## 3. Initial Login & Management

1. Once the **Staff Dashboard** is deployed, visit its URL.
2. Log in using the default admin credentials:
   - **Username**: `staff_admin`
   - **Password**: `staff123`
3. Click on the **Admin** button (or navigate to `/admin`) to create new staff worker accounts for your team.

---

## 4. GitHub Setup Guide

If you haven't pushed this to GitHub yet, run these commands from the root directory (`Resort Management System`):

```bash
# 1. Initialize git
git init

# 2. Add all files (respects the .gitignore files we created)
git add .

# 3. Commit
git commit -m "Initial commit with Docker, Auth, and Audio Notifications"

# 4. Link to your GitHub Repo and Push
git remote add origin https://github.com/your-username/resort-system.git
git branch -M main
git push -u origin main
```
