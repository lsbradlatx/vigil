# Steps You Need to Do Yourself (Vigil rename)

Everything that could be changed automatically **in the code** is already done (package name, UI text, metadata, localStorage keys + migration, README, DEPLOY doc). What’s left requires closing this project or using GitHub’s website.

---

## 1. Rename the project folder on your Desktop (required for “name on desktop”)

The folder can’t be renamed while Cursor has it open. Do this:

1. **Close Cursor** (File → Exit or close the window).
2. Open **File Explorer** and go to your **Desktop** (`C:\Users\bradl\OneDrive\Desktop`).
3. **Rename** the folder `stoic_sips` to `vigil`:
   - Right‑click `stoic_sips` → **Rename** → type `vigil` → Enter.
4. **Reopen the project in Cursor**: File → Open Folder → choose `vigil` on your Desktop (the folder you just renamed).

After this, your project path will be `...\Desktop\vigil` and git push/pull will still work (remote is stored inside `.git`).

---

## 2. (Optional) Rename the GitHub repo and update the remote

Your current remote is: `https://github.com/lsbradlatx/stoicsips.git`

If you want the repo name to be **vigil** too:

### On GitHub (in the browser)

1. Open **https://github.com/lsbradlatx/stoicsips**
2. Click **Settings** (repo settings, not your account).
3. Under **General**, find **Repository name**.
4. Change `stoicsips` to **vigil** and click **Rename**.

### On your PC (after reopening the project from the `vigil` folder)

In PowerShell or Cursor’s terminal, from your project folder (`...\Desktop\vigil`), run:

```powershell
git remote set-url origin https://github.com/lsbradlatx/vigil.git
```

Then run `git push` as usual; it will use the new URL.

If you **don’t** rename the repo on GitHub, you can keep pushing to `stoicsips` — no change needed.

---

## Summary

| What                         | Status / who does it |
|-----------------------------|----------------------|
| Package name, UI, metadata  | Done in code         |
| localStorage → `vigil_*`    | Done + migration     |
| README, DEPLOY doc          | Done                 |
| Desktop folder → `vigil`    | **You:** close Cursor, rename folder, reopen from `vigil` |
| GitHub repo name → vigil    | **You (optional):** GitHub Settings → rename repo, then `git remote set-url ...` above |
