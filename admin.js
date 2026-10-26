
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  firebaseConfig,
  TEACHER_UID
} from "./firebase-config.js";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwCJlhdo5BnRAcyHSOtNUuKqSD4mUnNaRYl5f1hGEmeRwTBVp1Pp4WYKXjvZaDPnWTi/exec";

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);

const $ = id => document.getElementById(id);

const loginForm = $("login-form");
const loginMessage = $("login-message");
const emailInput = $("email");
const passwordInput = $("password");
const loginButton = $("login-button");

const dashboardPanel = $("dashboard-panel");
const signedInAs = $("signed-in-as");
const logoutButton = $("logout-button");

const uploadForm = $("upload-form");
const classInput = $("classNo");
const subjectInput = $("subject");
const titleInput = $("pdfTitle");
const fileInput = $("pdfFile");
const uploadButton = $("upload-button");
const uploadMessage = $("upload-message");
const adminFileList = $("admin-file-list");

let isUploading = false;

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

function errorMessage(error) {
  console.error(error);
  return error?.message || String(error) || "Unknown error";
}

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: "follow",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("HTTP error: " + response.status);
  }

  return await response.json();
}

async function loadMaterials() {
  if (!adminFileList) return;

  adminFileList.textContent = "PDF list load ho rahi hai...";

  try {
    const result = await getJson(
      API_URL + "?action=list&t=" + Date.now()
    );

    console.log("PDF list API response:", result);

    if (!result.success) {
      throw new Error(
        result.message || "PDF list load nahi hui."
      );
    }

    const materials = Array.isArray(result.materials)
      ? result.materials
      : [];

    adminFileList.replaceChildren();

    if (materials.length === 0) {
      adminFileList.textContent =
        "Abhi koi PDF upload nahi hui hai.";
      return;
    }

    materials.forEach(item => {
      const row = document.createElement("div");
      row.className = "admin-row";

      const details = document.createElement("div");

      const heading = document.createElement("strong");
      heading.textContent = item.title || item.fileName || "PDF";

      const info = document.createElement("p");
      info.textContent =
        `Class ${item.classNo} | ${item.subject || "-"} | ${item.fileName || ""}`;

      details.append(heading, info);
      row.appendChild(details);

      if (item.url) {
        const link = document.createElement("a");
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View PDF";
        row.appendChild(link);
      }

      adminFileList.appendChild(row);
    });

  } catch (error) {
    console.error("PDF list error:", error);

    adminFileList.textContent =
      "PDF list load nahi hui: " + errorMessage(error);
  }
}

loginForm?.addEventListener("submit", async event => {
  event.preventDefault();

  if (loginButton) loginButton.disabled = true;
  if (loginMessage) loginMessage.textContent = "Logging in...";

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    if (result.user.uid !== TEACHER_UID) {
      await signOut(auth);
      throw new Error("Ye authorized teacher account nahi hai.");
    }

    if (loginMessage) loginMessage.textContent = "";

    showDashboard(result.user);
    await loadMaterials();

  } catch (error) {
    if (loginMessage) {
      loginMessage.textContent = errorMessage(error);
    }
  } finally {
    if (loginButton) loginButton.disabled = false;
  }
});

onAuthStateChanged(auth, async user => {
  if (user && user.uid === TEACHER_UID) {
    showDashboard(user);
    await loadMaterials();
  } else {
    showLogin();

    if (user) {
      await signOut(auth).catch(console.error);
    }
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");

      if (comma < 0) {
        reject(new Error("PDF read nahi hui."));
        return;
      }

      resolve(value.slice(comma + 1));
    };

    reader.onerror = () => {
      reject(new Error("PDF read nahi hui."));
    };

    reader.readAsDataURL(file);
  });
}

uploadForm?.addEventListener("submit", async event => {
  event.preventDefault();

  if (isUploading) return;

  const user = auth.currentUser;

  if (!user || user.uid !== TEACHER_UID) {
    if (uploadMessage) {
      uploadMessage.textContent = "Pehle teacher login karo.";
    }
    return;
  }

  const classNo = Number(classInput?.value);
  const subject = subjectInput?.value.trim() || "";
  const title = titleInput?.value.trim() || "";
  const file = fileInput?.files?.[0];

  if (!Number.isInteger(classNo) || classNo < 1 || classNo > 8) {
    uploadMessage.textContent = "Class 1 se 8 select karo.";
    return;
  }

  if (!subject || !title || !file) {
    uploadMessage.textContent =
      "Subject, title aur PDF select karo.";
    return;
  }

  if (
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    uploadMessage.textContent = "Sirf PDF file upload karo.";
    return;
  }

  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    uploadMessage.textContent =
      "PDF ka size 5 MB ya usse kam rakho.";
    return;
  }

  isUploading = true;
  if (uploadButton) uploadButton.disabled = true;

  uploadMessage.textContent = "PDF prepare ho rahi hai...";

  try {
    const idToken = await user.getIdToken();
    const base64 = await fileToBase64(file);

    uploadMessage.textContent =
      "Google Drive par upload ho rahi hai...";

    const result = await getJson(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        idToken,
        classNo,
        subject,
        title,
        fileName: file.name,
        mimeType: "application/pdf",
        base64
      })
    });

    console.log("Upload API response:", result);

    if (!result.success) {
      throw new Error(
        result.message || "Upload fail ho gaya."
      );
    }

    uploadMessage.textContent =
      "PDF upload ho gayi! List refresh ho rahi hai...";

    uploadForm.reset();

    await loadMaterials();

    uploadMessage.textContent =
      "PDF upload successful!";

  } catch (error) {
    console.error("Upload error:", error);

    uploadMessage.textContent =
      "Upload/response error: " + errorMessage(error) +
      ". Drive folder mein check karo ki PDF upload hui hai ya nahi.";

  } finally {
    isUploading = false;
    if (uploadButton) uploadButton.disabled = false;
  }
});

logoutButton?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Logout failed: " + errorMessage(error));
  }
});
 