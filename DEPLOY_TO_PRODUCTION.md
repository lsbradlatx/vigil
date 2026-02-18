# Get Stoic Sips Live on the Internet — Complete Beginner Guide

This guide gets your app running at a real web address so anyone can open it in a browser. You’ll do two main things:

1. **Put your project on GitHub** — Think of GitHub as a safe, online copy of your project. Railway (the host) will use this copy to run your app. You don’t need to know how Git works; just follow the steps.
2. **Deploy on Railway** — Railway is a service that runs your app on their servers and gives you a link (like `https://something.up.railway.app`). You’ll connect your GitHub project so Railway can build and run it.

You’ll need:
- Your project folder: `stoic_sips` (on your Desktop).
- Any secret keys you already use locally (e.g. for Google Calendar), so you can type them into Railway later.

---

# Part 1: Put Your Project on GitHub

## What is GitHub?

GitHub is a website where people store code. We’re using it because Railway needs to “see” your project from the internet. You’ll upload your project once; after that, when you make changes, you’ll run one short command to update the copy on GitHub.

---

## Step 1.1: Create a GitHub account (if you don’t have one)

1. Open your browser and go to: **https://github.com**
2. Click **Sign up**.
3. Enter your email, a password, and a username. Complete the sign-up (they may send you a code to verify).
4. You’re in. Remember your username — you’ll need it soon.

---

## Step 1.2: Install Git on your computer

Git is a small program that lets your computer talk to GitHub (upload and update your code).

1. Go to: **https://git-scm.com/download/win**
2. Download **“Click here to download”** for Windows.
3. Run the installer. You can leave all the default options (just keep clicking **Next**).
4. When it says **Finish**, click it. Git is now installed.

**Check that it worked:**  
- Press the **Windows key**, type **PowerShell**, and open **Windows PowerShell** (or **Terminal**).  
- Type exactly: `git --version` and press **Enter**.  
- You should see something like `git version 2.43.0`. If you see “not recognized,” close PowerShell, restart your computer, and try again.

---

## Step 1.3: Create a new repository on GitHub

A “repository” (or “repo”) is just one project’s folder on GitHub.

1. In your browser, go to **https://github.com** and make sure you’re logged in.
2. In the top right, click the **+** icon, then **New repository**.
3. **Repository name:** type `stoic-sips` (or any name you like — no spaces).
4. Leave everything else as is: **Public**, and **do not** check “Add a README” or “Add .gitignore.”
5. Click **Create repository**.

You’ll see a page that says “Quick setup” and shows a URL like  
`https://github.com/YOUR_USERNAME/stoic-sips.git`.  
Keep this page open; you’ll need that URL in a moment. Replace **YOUR_USERNAME** in your head with the username you see in the URL (your actual GitHub username).

---

## Step 1.4: Open your project folder in PowerShell

You need to run commands *inside* your project folder.

1. Open **File Explorer** and go to your Desktop, then into the **stoic_sips** folder.
2. Click once in the **address bar** at the top (where it shows the path). Type: `powershell` and press **Enter**.  
   A PowerShell window will open, and it will already be “in” that folder.

If that doesn’t work:
- Open PowerShell from the Start menu, then type:  
  `cd C:\Users\bradl\OneDrive\Desktop\stoic_sips`  
  and press **Enter**. (If your Desktop is somewhere else, use that path instead.)

---

## Step 1.5: Tell Git who you are (one-time setup)

Git needs your name and email so it can label your uploads. Use the same email as your GitHub account.

Run these two commands **one at a time** (replace with your real name and email):

```
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

Press **Enter** after each line. Nothing dramatic will happen; that’s normal.

---

## Step 1.6: Turn your folder into a Git project and push to GitHub

Run these commands **in order**, one at a time, in PowerShell (still in the `stoic_sips` folder).

**Command 1 — Start tracking this folder with Git:**  
```
git init
```  
Meaning: “Treat this folder as a Git project.”

**Command 2 — Add all your files:**  
```
git add .
```  
Meaning: “Stage every file in this folder so we can upload it.”  
(The dot means “everything here.”)

**Command 3 — Save a snapshot with a message:**  
```
git commit -m "Initial commit - Stoic Sips app"
```  
Meaning: “Save this snapshot and call it ‘Initial commit - Stoic Sips app’.”

**Command 4 — Name the GitHub repo (use YOUR GitHub URL):**  
You need to replace `YOUR_USERNAME` with your real GitHub username and `stoic-sips` if you used a different repo name.

```
git remote add origin https://github.com/YOUR_USERNAME/stoic-sips.git
```  
Meaning: “The online copy of this project lives at this GitHub address.”

**Command 5 — Rename the branch to main (if needed):**  
```
git branch -M main
```  
Meaning: “Call the main branch ‘main’ so it matches GitHub.”

**Command 6 — Upload to GitHub:**  
```
git push -u origin main
```  
Meaning: “Send my code to GitHub.”

- The first time you run `git push`, a window or browser tab may open and ask you to **log in to GitHub**. Do that (they might call it “Sign in with your browser” or use a personal access token — follow the prompts).
- When it finishes, you should see something like “Branch 'main' set up to track remote branch 'main' from 'origin'.”

**You’re done with Part 1.** If you go to `https://github.com/YOUR_USERNAME/stoic-sips` in your browser, you should see all your project files there.

---

# Part 2: Prepare the app for the host (one command)

Railway will run your app with a **PostgreSQL** database (we already set your project to use it). One command prepares the code for that.

In PowerShell, in your **stoic_sips** folder, run:

```
npx prisma generate
```

Meaning: “Generate the database client for the current database type.”  
When it finishes, push this change to GitHub so Railway gets it:

```
git add .
git commit -m "Use PostgreSQL for production"
git push
```

Meaning: “Save this change and upload it to GitHub.”

---

# Part 3: Deploy on Railway

## What is Railway?

Railway is a hosting service. It takes the code from your GitHub repo, builds it, runs it on their servers, and gives you a link. When someone opens that link, they see your app. Railway also gives you a database (PostgreSQL) that your app will use in production.

---

## Step 3.1: Create a Railway account and project

1. Go to **https://railway.app** in your browser.
2. Click **Login** (or **Start a Project**), then choose **Login with GitHub**.
3. Authorize Railway so it can see your GitHub account and repos.
4. Back on Railway, click **New Project**.
5. Choose **Deploy from GitHub repo**.
6. You should see a list of your repositories. Click **stoic-sips** (or whatever you named it). If you don’t see it, click **Configure GitHub App** and give Railway access to that repo, then try again.
7. Railway will create a “service” for your app and start building. You’ll see logs. **Don’t worry if the first deploy fails** — we still need to add the database and some settings. Leave this tab open.

---

## Step 3.2: Add a PostgreSQL database

1. On the same Railway project page, click **+ New** (or **Add service**).
2. Choose **Database** → **PostgreSQL**.
3. Railway will add a second “service” — a Postgres database. Click on that **Postgres** service (the database, not your app).
4. Open the **Variables** or **Connect** tab. You’ll see a variable like **DATABASE_URL** or **Postgres connection URL** — a long line starting with `postgresql://`. **Copy that entire URL** (Ctrl+C). You’ll paste it into your app in the next step.

---

## Step 3.3: Give your app the database link and other secrets

1. Click back on your **app service** (the one that says “stoic-sips” or your repo name, not Postgres).
2. Open the **Variables** tab.
3. Click **Add variable** or **New variable** (or **RAW Editor** if you prefer to paste several at once).
4. Add this variable first:
   - **Name:** `DATABASE_URL`  
   - **Value:** paste the long `postgresql://...` URL you copied from the Postgres service.
5. Add any other variables your app already uses on your PC. For example, if you use Google Calendar, you might have a `.env` file in your project with lines like:
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
   - `GOOGLE_REDIRECT_URI=...`  
   Copy those **names** and **values** into Railway as well. For `GOOGLE_REDIRECT_URI` you can use your Railway app URL for now (you’ll get that in Step 3.5; you can come back and add or change it later).
6. Save. Railway will automatically redeploy your app with the new variables.

---

## Step 3.4: Set the build and start commands

These tell Railway *how* to build and run your app.

1. Still in your **app service** (not Postgres), open the **Settings** tab.
2. Find **Build Command**. Clear anything there and enter exactly:
   ```
   npx prisma generate && npm run build
   ```
   Meaning: “Generate the DB client, then build the Next.js app.”
3. Find **Start Command** (or **Custom start command**). Set it to:
   ```
   npx prisma db push && npm run start
   ```
   Meaning: “Create/update the database tables, then start the app.”
4. Save. Railway will redeploy again. Wait until the deploy finishes (you’ll see “Success” or a green check).

---

## Step 3.5: Get your live link

1. In your **app service**, go to **Settings** again.
2. Find **Networking** or **Public networking** or **Generate domain**.
3. Click **Generate domain** (or **Add domain** and use the default). Railway will create a URL like:
   `https://stoic-sips-production-xxxx.up.railway.app`
4. Copy that URL and open it in your browser. **Your app is now live.** That link is your “production” site. You can share it or use it until you connect your GoDaddy domain later.

---

# Quick recap

| What you did | Why |
|--------------|-----|
| Created a GitHub account | So you have a place to store your code online. |
| Installed Git | So your PC can send code to GitHub. |
| Created a repo and ran `git init`, `add`, `commit`, `remote`, `push` | So your project is uploaded to GitHub. |
| Ran `npx prisma generate` and pushed | So the app is ready for PostgreSQL on Railway. |
| Logged into Railway with GitHub | So Railway can see your repo. |
| Created a new project from your GitHub repo | So Railway has a copy of your app to run. |
| Added a Postgres database | So your app has a real database in production. |
| Set `DATABASE_URL` and other variables on the app | So the app knows how to connect to the DB and to Google (etc.). |
| Set build and start commands | So Railway knows how to build and run your app. |
| Generated a domain | So your app gets a public URL. |

---

# If something goes wrong

- **“Git is not recognized”** — Install Git from git-scm.com (Step 1.2) and restart your computer, then try again.
- **GitHub asks for a “personal access token”** — On GitHub go to Settings → Developer settings → Personal access tokens, create a token, and when Git asks for a password, paste the token.
- **Railway deploy fails** — Check the **Deployments** tab and the build logs. Often the fix is: (1) correct **Build** and **Start** commands, (2) `DATABASE_URL` set on the app service, (3) no typos in variable names.
- **App opens but shows an error** — Usually a missing or wrong variable (e.g. `DATABASE_URL` or Google keys). Double-check the **Variables** tab for your app service.

When you’re ready to use your GoDaddy domain, we can do a separate guide for connecting it to this Railway app.
