
const classGrid = document.getElementById("class-grid");
const pdfList = document.getElementById("pdf-list");
const materialsTitle = document.getElementById("materials-title");
const materialsHelp = document.getElementById("materials-help");

const API_URL =
  "https://script.google.com/macros/s/AKfycbwCJlhdo5BnRAcyHSOtNUuKqSD4mUnNaRYl5f1hGEmeRwTBVp1Pp4WYKXjvZaDPnWTi/exec";

let materials = [];
let selectedClass = null;

// Create Class 1 to Class 8 buttons.
for (let i = 1; i <= 8; i++) {
  const button = document.createElement("button");
  button.className = "class-card";
  button.type = "button";

  button.innerHTML = `
    <span class="class-book">📘</span>
    <strong>Class ${i}</strong>
    <span>View PDFs →</span>
  `;

  button.addEventListener("click", () => {
    selectedClass = i;
    renderMaterials();

    document.getElementById("materials")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  classGrid.appendChild(button);
}

// Load PDFs from Google Apps Script.
async function loadMaterials() {
  materialsHelp.textContent = "Loading study materials...";
  pdfList.textContent = "Please wait...";

  try {
    const response = await fetch(
      API_URL + "?action=list&t=" + Date.now()
    );

    if (!response.ok) {
      throw new Error("Server response: " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Could not load PDFs.");
    }

    materials = Array.isArray(result.materials)
      ? result.materials
      : [];

    if (selectedClass !== null) {
      renderMaterials();
    } else {
      materialsTitle.textContent = "Select Your Class";
      materialsHelp.textContent =
        "Choose a class above to view study materials.";
      pdfList.textContent =
        "📚 Select Class 1 to 8 to get started.";
    }
  } catch (error) {
    console.error("PDF loading error:", error);

    materialsTitle.textContent = "Study Materials";
    materialsHelp.textContent =
      "Could not load PDFs. Please refresh the page.";
    pdfList.textContent =
      "⚠️ PDFs load nahi hui. Internet connection check karke page refresh karo.";
  }
}

function renderMaterials() {
  if (selectedClass === null) return;

  materialsTitle.textContent =
    `Class ${selectedClass} — Study Materials`;

  materialsHelp.textContent =
    "Open or download your study material.";

  pdfList.replaceChildren();

  const classMaterials = materials.filter(
    item => Number(item.classNo) === selectedClass
  );

  if (classMaterials.length === 0) {
    pdfList.textContent =
      "📚 No PDFs uploaded for this class yet.";
    return;
  }

  classMaterials.forEach(item => {
    const card = document.createElement("article");
    card.className = "pdf-card";

    const title = document.createElement("h3");
    title.textContent =
      item.title || item.fileName || "Study Material";

    const subject = document.createElement("p");
    subject.textContent = item.subject || "Computer";

    const link = document.createElement("a");
    link.className = "button button-primary";
    link.href = item.url || item.file || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open PDF";

    card.append(title, subject, link);
    pdfList.appendChild(card);
  });
}

// Load materials when the page opens.
loadMaterials();
