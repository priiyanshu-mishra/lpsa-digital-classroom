
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const classList = document.getElementById("class-list");
const materialsList = document.getElementById("materials-list");
const heading = document.getElementById("class-heading");

let selectedClass = 1;
let materials = {};

for (let i = 1; i <= 8; i++) {
  const card = document.createElement("button");
  card.className = "class-card";
  card.type = "button";
  card.innerHTML = `<span class="class-book">📘</span>
    <strong>Class ${i}</strong><span>View PDFs →</span>`;

  card.addEventListener("click", () => {
    selectedClass = i;
    renderMaterials();
    document.getElementById("materials-section")
      .scrollIntoView({ behavior: "smooth" });
  });

  classList.appendChild(card);
}

function renderMaterials() {
  heading.textContent = `Class ${selectedClass} — Study Materials`;
  materialsList.replaceChildren();

  const list = Object.entries(materials)
    .filter(([, item]) =>
      item &&
      item.published === true &&
      Number(item.classNo) === selectedClass &&
      typeof item.downloadURL === "string" &&
      item.downloadURL.startsWith("https://")
    )
    .sort((a, b) => Number(b[1].createdAt || 0) -
                     Number(a[1].createdAt || 0));

  if (!list.length) {
    materialsList.textContent = "Study materials coming soon!";
    return;
  }

  for (const [, item] of list) {
    const card = document.createElement("article");
    card.className = "pdf-card";

    const title = document.createElement("h3");
    title.textContent = item.title || "Study Material";

    const subject = document.createElement("p");
    subject.textContent = item.subject || "General";

    const link = document.createElement("a");
    link.className = "button";
    link.href = item.downloadURL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Download PDF";

    card.append(title, subject, link);
    materialsList.appendChild(card);
  }
}

onValue(ref(db, "materials"), snapshot => {
  materials = snapshot.val() || {};
  renderMaterials();
}, error => {
  console.error(error);
  materialsList.textContent =
    "Materials could not load. Please try again later.";
});
