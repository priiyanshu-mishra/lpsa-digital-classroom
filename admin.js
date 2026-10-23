
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

import { firebaseConfig, TEACHER_UID } from "./firebase-config.js";

// Firebase initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// HTML elements
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");

const dashboardPanel = document.getElementById("dashboard-panel");
const signedInAs = document.getElementById("signed-in-as");
const logoutButton = document.getElementById("logout-button");

const uploadForm = document.getElementById("upload-form");
const classInput = document.getElementById("classNo");
const subjectInput = document.getElementById("subject");
const titleInput = document.getElementById("pdfTitle");
const fileInput = document.getElementById("pdfFile");
const uploadButton = document.getElementById("upload-button");
const uploadMessage = document.getElementById("upload-message");
const adminFileList = document.getElementById("admin-file-list");

let stopMaterialsListener = null;
let isUploading = false;

// Show readable error messages
function showError(error) {
  console.error("Firebase error:", error);

  const code = error?.code || "";
  const messages = {
    "auth/invalid-credential":
      "Email ya password galat hai. Firebase Authentication mein check karo.",
    "auth/user-not-found":
      "Teacher account nahi mila. Firebase Authentication mein account banao.",
    "auth/wrong-password":
      "Password galat hai. Dobara check karo.",
    "auth/operation-not-allowed":
      "Firebase Authentication mein Email/Password enable karo.",
    "auth/too-many-requests":
      "Bahut attempts hue hain. Thodi der baad try karo.",
    "auth/network-request-failed":
      "Internet connection check karo aur dobara try karo.",
    "storage/unauthorized":
      "Storage permission denied. Firebase Storage Rules check karo.",
    "storage/bucket-not-found":
      "Storage bucket nahi mila. Firebase Storage configuration check karo.",
    "storage/canceled":
      "Upload cancel ho gaya.",
    "storage/unknown":
      "Storage upload fail hua. Console mein full error check karo.",
    "PERMISSION_DENIED":
      "Database permission denied. Realtime Database Rules check karo."
  };

  return messages[code] || `${code ? code + ": " : ""}${error?.message || "Unknown error"}`;
}

// Show only the correct panel
function showLogin() {
  loginForm?.classList.remove("hidden");
  dashboardPanel?.classList.add("hidden");
}

function showDashboard(user) {
  loginForm?.classList.add("hidden");
  dashboardPanel?.classList.remove("hidden");

  if (signedInAs) {
    signedInAs.textContent = user.email || "Teacher";
  }
}

// LOGIN
loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loginButton) loginButton.disabled = true;
  if (loginMessage) loginMessage.textContent = "Logging in...";

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      throw new Error("Email aur password dono enter karo.");
    }

    const result = await signInWithEmailAndPassword(auth, email, password);

    if (result.user.uid !== TEACHER_UID) {
      await signOut(auth);
      throw new Error("Ye account authorized teacher account nahi hai.");
    }

    if (loginMessage) loginMessage.textContent = "";
    showDashboard(result.user);

  } catch (error) {
    if (loginMessage) loginMessage.textContent = showError(error);
  } finally {
    if (loginButton) loginButton.disabled = false;
  }
});

// AUTH STATE
onAuthStateChanged(auth, (user) => {
  if (user && user.uid === TEACHER_UID) {
    showDashboard(user);
    startMaterialsListener();
  } else {
    if (stopMaterialsListener) {
      stopMaterialsListener();
      stopMaterialsListener = null;
    }

    if (user) {
      signOut(auth).catch(console.error);
    }

    showLogin();
  }
});

// UPLOAD PDF
uploadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isUploading) return;

  const user = auth.currentUser;

  if (!user || user.uid !== TEACHER_UID) {
    if (uploadMessage) {
      uploadMessage.textContent = "Please login with the authorized teacher account.";
    }
    return;
  }

  const classNo = Number(classInput.value);
  const subject = subjectInput.value.trim();
  const title = titleInput.value.trim();
  const file = fileInput.files?.[0];

  if (!Number.isInteger(classNo) || classNo < 1 || classNo > 8) {
    uploadMessage.textContent = "Class 1 se 8 ke beech select karo.";
    return;
  }

  if (!subject || !title || !file) {
    uploadMessage.textContent = "Subject, PDF title aur file select karo.";
    return;
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    uploadMessage.textContent = "Sirf PDF file upload kar sakte ho.";
    return;
  }

  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    uploadMessage.textContent = "PDF empty nahi honi chahiye aur size 10 MB se kam rakho.";
    return;
  }

  isUploading = true;
  if (uploadButton) uploadButton.disabled = true;
  uploadMessage.textContent = "PDF upload ho rahi hai. Please wait...";

  let uploadedFilePath = null;

  try {
    // Confirm the user session
    await user.getIdToken();

    // Create a unique database record ID
    const materialRef = push(ref(database, "materials"));
    const id = materialRef.key;

    if (!id) throw new Error("PDF record ID create nahi hua.");

    // Upload the file
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `published/class-${classNo}/${id}_${safeFileName}`;
    const fileRef = storageRef(storage, path);

    uploadedFilePath = path;

    uploadMessage.textContent = "Step 1/2: PDF Storage par upload ho rahi hai...";

    const snapshot = await uploadBytes(fileRef, file, {
      contentType: "application/pdf"
    });

    // Get download URL
    uploadMessage.textContent = "Step 2/2: PDF details save ho rahi hain...";
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save metadata
    await set(materialRef, {
      classNo,
      title,
      subject,
      storagePath: path,
      downloadURL,
      originalFileName: file.name,
      size: file.size,
      published: true,
      createdAt: Date.now(),
      createdBy: user.uid
    });

    uploadMessage.textContent = "PDF successfully upload ho gayi!";
    uploadForm.reset();

  } catch (error) {
    const readableError = showError(error);
    uploadMessage.textContent = "Upload failed: " + readableError;

    // If Storage upload succeeded but saving metadata failed,
    // try removing the orphaned file.
    if (uploadedFilePath) {
      try {
        await deleteObject(storageRef(storage, uploadedFilePath));
      } catch (cleanupError) {
        console.error("Temporary file cleanup failed:", cleanupError);
      }
    }
  } finally {
    isUploading = false;
    if (uploadButton) uploadButton.disabled = false;
  }
});

// DISPLAY MATERIALS
function startMaterialsListener() {
  if (stopMaterialsListener) return;

  const materialsRef = ref(database, "materials");

  stopMaterialsListener = onValue(
    materialsRef,
    (snapshot) => {
      if (!adminFileList) return;

      adminFileList.replaceChildren();

      const materials = snapshot.val();

      if (!materials) {
        adminFileList.textContent = "Abhi koi PDF upload nahi hui hai.";
        return;
      }

      const entries = Object.entries(materials)
        .filter(([, item]) => item && item.published === true)
        .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

      if (entries.length === 0) {
        adminFileList.textContent = "Abhi koi published PDF nahi hai.";
        return;
      }

      for (const [id, item] of entries) {
        const row = document.createElement("div");
        row.className = "admin-row";

        const details = document.createElement("div");

        const heading = document.createElement("strong");
        heading.textContent = item.title || item.originalFileName || "PDF";

        const info = document.createElement("p");
        info.textContent =
          `Class ${item.classNo || "-"} | ${item.subject || "-"} | ${item.originalFileName || ""}`;

        details.append(heading, info);

        const link = document.createElement("a");
        link.href = item.downloadURL;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View PDF";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", async () => {
          const confirmed = window.confirm(
            `Kya tum "${item.title || "PDF"}" delete karna chahte ho?`
          );

          if (!confirmed) return;

          deleteButton.disabled = true;

          try {
            const currentUser = auth.currentUser;

            if (!currentUser || currentUser.uid !== TEACHER_UID) {
              throw new Error("Teacher authorization required.");
            }

            if (item.storagePath) {
              try {
                await deleteObject(storageRef(storage, item.storagePath));
              } catch (storageError) {
                // Continue only if the object is already missing.
                if (storageError.code !== "storage/object-not-found") {
                  throw storageError;
                }
              }
            }

            await remove(ref(database, `materials/${id}`));
          } catch (error) {
            alert("Delete failed: " + showError(error));
            deleteButton.disabled = false;
          }
        });

        row.append(details, link, deleteButton);
        adminFileList.appendChild(row);
      }
    },
    (error) => {
      if (adminFileList) {
        adminFileList.textContent = "PDF list load nahi hui: " + showError(error);
      }
    }
  );
}

// LOGOUT
logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Logout failed: " + showError(error));
  }
});
