# Chuligram — Complete Project (Frontend + Backend)

Everything is in this one folder. No copying files into an old project —
just use this folder as your project from now on.

```
chuligram-full/
├── Index.html          <- open this with Live Server
├── Style.css
├── App.js
├── Manifest.json
├── Sw.js
├── Logo-avatar.png / Icon-192.png / Icon-512.png
├── Pages/
│   ├── Home.html
│   ├── Chat.html
│   ├── Contacts.html
│   ├── Profile.html
│   ├── Search.html
│   └── Settings.html
└── backend/             <- the Node/Express/MySQL/Socket.IO server
    ├── server.js
    ├── db/schema.sql
    ├── db/seed.js
    └── ...
```

## 1. Database

Open `backend/db/schema.sql` in MySQL Workbench and run it (the ⚡ button).
This creates the `chuligram` database and all its tables.

## 2. Backend

Open a terminal in the `backend` folder and run:

```
npm install
copy .env.example .env
notepad .env
```

In `.env`, set `DB_PASSWORD` to your real MySQL password, and set
`JWT_SECRET` to any random text. Save and close.

```
npm run seed
npm start
```

Leave this terminal open — it's your live server on `http://localhost:4000`.

## 3. Frontend

Open this whole `chuligram-full` folder in VS Code, right-click `Index.html`,
choose **Open with Live Server**. Log in with:

- Username: `alex`
- Password: `1234`

(any of `abraham`, `user03`…`user10` also work, all with password `1234`)

That's it — no other files to touch.
