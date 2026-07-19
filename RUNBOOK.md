# Runbook — How to Run the Certificate Portal

Follow these steps in order. Commands are for Ubuntu/Debian-based Linux;
Windows/Mac notes are called out where they differ.

---

## 1. Install the required software

| Software | Version | Why |
|---|---|---|
| **Node.js** | v22.12.0 or newer (v22.22.x recommended) | Required by Angular CLI 19.2.27 |
| **npm** | v10+ (comes bundled with Node) | Package installs |
| **MySQL Server** | 8.0.x | Database |
| **Angular CLI** | 19.2.27 | Frontend build tooling |

### Install Node.js
Download from https://nodejs.org (choose the LTS or a 22.x build) or use a
version manager like `nvm`:
```bash
nvm install 22.22.2
nvm use 22.22.2
node -v   # confirm v22.x
```

### Install MySQL Server
**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y mysql-server
sudo service mysql start
```
**Windows:** download the installer from
https://dev.mysql.com/downloads/mysql/ (choose "MySQL Installer for Windows")
and run it — it sets up the MySQL service to start automatically. To
start/check it manually anytime:
```cmd
net start MySQL80
```
(The service name is usually `MySQL80` for MySQL 8.0, but the installer shows
you the exact name — or open the **Services** app (`services.msc`), find the
entry starting with "MySQL", and start it from there if `net start` gives a
"service name is invalid" error.)

**Mac:** download the installer from https://dev.mysql.com/downloads/mysql/,
or `brew install mysql && brew services start mysql` if you use Homebrew.

### Install Angular CLI globally
```bash
npm install -g @angular/cli@19.2.27
ng version   # confirm Angular CLI: 19.2.27
```

---

## 2. Set up the database

Open a MySQL shell as root (adjust if your root has a password):
```bash
mysql -u root
```
Then run:
```sql
CREATE DATABASE IF NOT EXISTS certificate_portal;
CREATE USER IF NOT EXISTS 'cert_app'@'localhost' IDENTIFIED WITH mysql_native_password BY 'cert_app_pw';
GRANT ALL PRIVILEGES ON certificate_portal.* TO 'cert_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
(Feel free to change `cert_app_pw` to your own password — just remember to
update `server/.env` in the next step to match.)

Load the schema and seed data:
```bash
cd certificate-portal/server
mysql -u cert_app -p certificate_portal < schema.sql
# enter cert_app_pw when prompted
```

Verify it worked:
```bash
mysql -u cert_app -p certificate_portal -e "SELECT COUNT(*) FROM students;"
# should show 12
```

---

## 3. Configure and start the backend (Express API)

```bash
cd certificate-portal/server
```

Copy the example environment file to create your working `.env`:

- **Mac/Linux:**
  ```bash
  cp .env.example .env
  ```
- **Windows (Command Prompt):**
  ```cmd
  copy .env.example .env
  ```
- **Windows (PowerShell):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **Any OS, no terminal needed:** just duplicate `.env.example` in File Explorer/Finder and rename the copy to `.env`.

Open `.env` and confirm the DB credentials match what you created in step 2
(the defaults already match the commands above, so you can usually leave it
as-is).

Install dependencies and start the server:
```bash
npm install
npm start
```
You should see:
```
Certificate portal API listening on http://localhost:4000
```
Leave this terminal running. Quick sanity check in another terminal:
```bash
curl http://localhost:4000/api/health
# {"ok":true}
```

---

## 4. Configure and start the frontend (Angular)

Open a **new terminal** (keep the backend running in the first one):
```bash
cd certificate-portal/client
npm install
npm start
```
This runs `ng serve`. Once it finishes compiling you'll see:
```
➜  Local:   http://localhost:4200/
```

If your backend runs somewhere other than `http://localhost:4000`, update
the URL in `client/src/app/core/api-config.ts` before starting the frontend.

---

## 5. Open the app

Visit **http://localhost:4200** in your browser. You'll land on the login
page with three tabs: **Admin Login / Teacher Login / Student Login**.

Try each role with the seed credentials from the main README:

- **Admin:** `admin` / `admin123`
- **Teacher:** `anitha.kumar@college.edu` / `teacher123`
- **Student:** register number `21CS001`, email `aarthi.selvam@student.edu`

---

## 6. Everyday startup (after the first-time setup above)

Each time you want to run the project again, you only need:

```bash
# Terminal 1 — make sure MySQL is running
# Linux:   sudo service mysql start
# Windows: net start MySQL80   (or start it from services.msc)
# Mac:     brew services start mysql   (or via System Settings if installed via .dmg)

# Terminal 2 — backend
cd certificate-portal/server
npm start

# Terminal 3 — frontend
cd certificate-portal/client
npm start
```

Then open http://localhost:4200.

---

## Troubleshooting

- **`ECONNREFUSED` / "Can't connect to MySQL"** → MySQL service isn't running.
  Linux: `sudo service mysql start`. Windows: `net start MySQL80` (or start it
  from the Services app, `services.msc`). Mac: `brew services start mysql`.
- **CORS errors in the browser console** → Confirm the backend's
  `server/.env` has `CLIENT_ORIGIN=http://localhost:4200` and that you
  restarted the backend after editing `.env`.
- **Login always fails for a teacher/student that should exist** → Check the
  `is_verified` column for that row — unverified teachers/students are
  rejected at login by design until an admin approves them.
- **`ng: command not found`** → The global Angular CLI install didn't
  complete, or your shell needs to be reopened to pick up the new PATH entry.
