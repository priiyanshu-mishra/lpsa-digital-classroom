
const classGrid = document.getElementById("class-grid");
const pdfList = document.getElementById("pdf-list");
const materialsTitle = document.getElementById("materials-title");
const materialsHelp = document.getElementById("materials-help");

const materials = [
  {
    classNo: 1,
    subject: "Computer",
    title: "Chapter 01 - Computer Fundamental",
    file: "CHAPTER%2001%20COMPUTER%20FUNDAMENTAL.pdf"
  }
];

let selectedClass = 1;

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

function renderMaterials() {
  materialsTitle.textContent =
    `Class ${selectedClass} — Study Materials`;

  materialsHelp.textContent = "Open or download your study material.";
  pdfList.replaceChildren();

  const list = materials.filter(
    item => item.classNo === selectedClass
  );

  if (list.length === 0) {
    pdfList.textContent = "📚 No PDFs uploaded for this class yet.";
    return;
  }

  list.forEach(item => {
    const card = document.createElement("article");
    card.className = "pdf-card";

    const title = document.createElement("h3");
    title.textContent = item.title;

    const subject = document.createElement("p");
    subject.textContent = item.subject;

    const link = document.createElement("a");
    link.className = "button button-primary";
    link.href = item.file;
    link.textContent = "Download PDF";
    link.setAttribute("download", "");

    card.append(title, subject, link);
    pdfList.appendChild(card);
  });
}

renderMaterials();
