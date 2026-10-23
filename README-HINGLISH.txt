# L.P. Savani Academy Digital Classroom

## Important before running
This is a static HTML/CSS/Vanilla JavaScript site using Firebase modular Web SDK. It needs your own Firebase project values and teacher UID. Those cannot be prefilled because they are unique to your Firebase project.

## Files
- `index.html`, `style.css`, `app.js`: public student site
- `admin.html`, `admin.js`: teacher dashboard
- `firebase-config.js`: Firebase web app config and teacher UID
- `database.rules.json`: Realtime Database rules
- `storage.rules.txt`: Cloud Storage rules

## Firebase setup
1. Open https://console.firebase.google.com and create a project.
2. Project settings (gear) > General > Your apps > Add app > Web. Register the app and copy its config into `firebase-config.js`.
3. Enable Authentication > Sign-in method > Email/Password.
4. Authentication > Users > Add user. Create a teacher email/password. Do not create a public sign-up page.
5. Copy that user's UID from the Users table. Replace `PASTE_TEACHER_AUTH_UID` in `firebase-config.js`.
6. Replace `REPLACE_WITH_TEACHER_UID` in BOTH `database.rules.json` and `storage.rules.txt` with the exact same UID.
7. Create Realtime Database. Copy its database URL into `databaseURL` in `firebase-config.js`.
8. Enable Storage / create the Storage bucket. Copy its bucket name into `storageBucket` in `firebase-config.js`.
9. In Realtime Database > Rules, paste the contents of `database.rules.json` and click Publish.
10. In Storage > Rules, paste the contents of `storage.rules.txt` and click Publish.
11. Add the Firebase Web App config values to `firebase-config.js`. `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, and `appId` come from Firebase project settings.

## Run on Windows with VS Code
1. Extract the ZIP to a folder.
2. Open that folder in VS Code.
3. Install the **Live Server** extension.
4. Open `index.html`, right-click, choose **Open with Live Server**.
5. For the teacher page, open `admin.html` on the same Live Server host.

Do not open the HTML by double-clicking it; ES modules work best over localhost/HTTPS.

## Test
1. Open `admin.html`, sign in with the teacher account, choose a class, enter a title and subject, select a PDF under 10 MB, and upload.
2. Return to `index.html`, open that class, and download the PDF.
3. Sign out, then try opening `admin.html`; you should see the login screen.
4. To verify real enforcement, try unauthenticated upload/write using Firebase SDK or Rules Playground. Storage writes and database writes must be denied without the teacher UID.
5. Confirm an unrelated authenticated account cannot upload/delete. Only the exact teacher UID is authorised.

## Publishing
Use Firebase Hosting or another static HTTPS host. For Firebase Hosting, install Node.js, then in a terminal run:
`npm install -g firebase-tools`
`firebase login`
`firebase init hosting`
Choose the project, set the public directory to this folder (or copy files into `public`), configure as a single-page app: No, do not overwrite `index.html`, then run `firebase deploy`.

## Security and operational notes
- Public PDFs are intentionally readable/downloadable by anyone who can access the site. Do not upload confidential student records.
- Firebase rules enforce teacher-only writes. The teacher UID in the client config is a UI check, not a secret; the server-side rules are the actual protection.
- Keep the teacher account password private and use a strong unique password.
- The Storage rules validate PDF MIME type and size. MIME type is not a perfect proof that file contents are a real PDF, but it blocks ordinary accidental wrong-file uploads.
- When deleting a database record and Storage file, the dashboard removes the database entry first and then attempts to delete the file. If Storage deletion fails, check the browser console and remove the leftover file in Firebase Storage manually.
- Firebase pricing and Storage availability depend on your project's current plan, region, and Firebase terms. Check the console before enabling billing.
