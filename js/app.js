const STORAGE_KEY = "stroitel.projects.v1";

const state = {
  projects: loadProjects()
};

const $ = (selector) => document.querySelector(selector);

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36);
}

function render() {
  const root = $("#projects");
  $("#projectCount").textContent = state.projects.length;

  if (!state.projects.length) {
    root.innerHTML = `<div class="empty">Пока нет объектов.<br>Создай первый — дальше добавим замеры, материалы и смету.</div>`;
    return;
  }

  root.innerHTML = state.projects.map(project => `
    <article class="project-card">
      <div class="project-top">
        <div>
          <div class="project-name">🏠 ${escapeHtml(project.name)}</div>
          <div class="project-meta">${escapeHtml(project.address || "Адрес не указан")}</div>
          ${project.client ? `<div class="project-meta">Заказчик: ${escapeHtml(project.client)}</div>` : ""}
        </div>
        <div class="muted">0%</div>
      </div>
      <div class="progress"><span style="width:0%"></span></div>
      <div class="project-stats">
        <span>📐 0 замеров</span>
        <span>💰 0 ₽</span>
      </div>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}

function openModal() {
  $("#modal").classList.remove("hidden");
  setTimeout(() => $("#projectName").focus(), 0);
}

function closeModal() {
  $("#modal").classList.add("hidden");
  $("#projectForm").reset();
}

function createProject(event) {
  event.preventDefault();

  const project = {
    id: uid(),
    name: $("#projectName").value.trim(),
    address: $("#projectAddress").value.trim(),
    client: $("#projectClient").value.trim(),
    createdAt: new Date().toISOString(),
    rooms: [],
    estimates: [],
    diary: []
  };

  state.projects.unshift(project);
  saveProjects();
  closeModal();
  render();
}

$("#addProjectBtn").addEventListener("click", openModal);
$("#heroAddBtn").addEventListener("click", openModal);
$("#closeModalBtn").addEventListener("click", closeModal);
$("#cancelBtn").addEventListener("click", closeModal);
$("#projectForm").addEventListener("submit", createProject);
$("#modal").addEventListener("click", (event) => {
  if (event.target === $("#modal")) closeModal();
});

render();
