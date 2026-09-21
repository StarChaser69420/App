
# Scots College Communication App

School communication app (mobile + web). Teachers post to school-wide
and class feeds; students and parents read. Fixes the current problem
of school info being spread across too many platforms.

Expo / React Native, TypeScript, Firebase (Auth, Firestore,
Hosting).

## Features

- Role-based permissions — teachers/admins post, students/parents read,
  enforced in Firestore security rules
- Live roles — change a role in Firebase and it updates without re-login
- Multi-use invite links that survive the login journey
- Real-time messaging, dark/light mode, responsive layout

## Run it

npm install
cp .env.example .env   # add your Firebase keys
npx expo start -c
```

## Deploy

npx expo export --platform web
firebase deploy --only hosting
```
```

Still need the two follow-ups from before: create a `.env.example` (six empty `EXPO_PUBLIC_FIREBASE_*` lines) and confirm `.env` is in `.gitignore`.