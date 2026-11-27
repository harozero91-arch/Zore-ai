
import "./styles.css";
import "../office.css";
import { mountZoreVirtualOffice } from "../index.js";

import {
  EMPLOYEE_PROFILES,
  getCharacterState,
  getCollaborators
} from "./employee-character-system.js";

const app = document.querySelector("#app");

let selectedEmployee = EMPLOYEE_PROFILES[0];

let currentTask = {
  title: "Menunggu tugas",
  description: ""
};

let currentEvent = "";
let taskDraft = "";
let officeInstance = null;

function renderEmployee(employee) {
  const state = getCharacterState(
    employee.id,
    currentTask,
    currentEvent
  );

  return `
    <article class="employee-card"
      style="--accent:${employee.accent}"
      data-id="${employee.id}">

      <div class="character-stage">
        <div class="character ${state.activity}">
          <div class="character-shadow"></div>
          <div class="character-body">
            <div class="character-head">
              <div class="hair"></div>
              <div class="eyes">
                <span></span><span></span>
              </div>
              <div class="mouth"></div>
            </div>
            <div class="character-torso"></div>
            <div class="character-arm left"></div>
            <div class="character-arm right"></div>
            <div class="character-legs"></div>
          </div>
        </div>
        <span class="mood">${state.mood}</span>
      </div>

      <div class="employee-info">
        <h3>${employee.name}</h3>
        <p>${employee.role}</p>

        <span class="employee-traits">
          ${employee.traits.join(" · ")}
        </span>

        <div class="employee-status">
          <span class="status-dot"></span>
          ${state.activity}
        </div>

        <button class="detail-button"
          data-select="${employee.id}">
          Lihat profil
        </button>
      </div>
    </article>
  `;
}

function renderProfile(employee) {
  const collaborators = getCollaborators(employee.id);

  return `
    <div class="profile-content">
      <div class="profile-heading">
        <span>PROFIL KARYAWAN</span>
        <h2>${employee.name}</h2>
        <p>${employee.role}</p>
      </div>

      <div class="profile-section">
        <h3>Kepribadian</h3>
        <p>${employee.traits.join(", ")}</p>
      </div>

      <div class="profile-section">
        <h3>Keahlian</h3>
        <p>${employee.skills.join(", ")}</p>
      </div>

      <div class="profile-section">
        <h3>Ciri khas</h3>
        <p>${employee.signature}</p>
      </div>

      <div class="profile-section">
        <h3>Pakaian</h3>
        <p>${employee.outfit}</p>
      </div>

      <div class="profile-section">
        <h3>Aksesori</h3>
        <p>${employee.accessory}</p>
      </div>

      <div class="profile-section">
        <h3>Gaya komunikasi</h3>
        <p>${employee.communication}</p>
      </div>

      <div class="profile-section">
        <h3>Rekan kolaborasi</h3>
        <p>${collaborators.map(item => item.name).join(", ")}</p>
      </div>
    </div>
  `;
}

function selectEmployee(employeeId) {
  const employee = EMPLOYEE_PROFILES.find(
    person => person.id === employeeId
  );

  if (!employee) return;

  selectedEmployee = employee;

  const profilePanel = document.querySelector("#profile-panel");

  if (profilePanel) {
    profilePanel.innerHTML = renderProfile(employee);
  }
}

function connectVirtualOffice() {
  const host = document.querySelector("#zore-office-mount");

  if (!host) {
    console.error("Tempat kantor virtual 3D tidak ditemukan.");
    return;
  }

  try {
    officeInstance = mountZoreVirtualOffice(host, {
      employees: EMPLOYEE_PROFILES,

      onEmployeeSelect: employee => {
        selectEmployee(employee.id);
      },

      onRoomChange: room => {
        console.info("Ruangan aktif:", room.name);
      }
    });
  } catch (error) {
    console.error("Kantor virtual gagal dimuat:", error);
    host.innerHTML = `
      <p style="padding:20px;color:#8b2d20">
        Kantor 3D gagal dimuat. Periksa koneksi dan dukungan WebGL.
      </p>
    `;
  }
}

function render() {
  if (officeInstance) {
    officeInstance.destroy();
    officeInstance = null;
  }

  app.innerHTML = `
    <header class="topbar">
      <div>
        <span class="eyebrow">
          VIRTUAL MANAGEMENT SYSTEM
        </span>

        <h1>ZORE <span>AI</span></h1>
        <p>Kantor Virtual Cerdas</p>
      </div>

      <div class="office-indicator">
        <span></span> KANTOR AKTIF
      </div>
    </header>

    <main>
      <section class="office-intro">
        <span>EXECUTIVE OFFICE</span>

        <h2>Selamat datang di kantor ZORE</h2>

        <p>
          Sembilan karakter karyawan dengan peran
          dan kepribadian berbeda.
        </p>
      </section>

      <section class="virtual-office-section">
        <div id="zore-office-mount"></div>
      </section>

      <section class="task-panel">
        <h3>Berikan tugas kepada karyawan</h3>

        <input
          id="task-input"
          value="${taskDraft.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"
          placeholder="Contoh: Menganalisis data perusahaan"
          autocomplete="off"
        >

        <select id="employee-select">
          ${EMPLOYEE_PROFILES.map(person => `
            <option value="${person.id}">
              ${person.name} — ${person.role}
            </option>
          `).join("")}
        </select>

        <select id="event-select">
          <option value="task_started">Mulai tugas</option>
          <option value="task_completed">Tugas selesai</option>
          <option value="idea_discovered">Menemukan ide</option>
          <option value="task_blocked">Tugas terhambat</option>
          <option value="positive_feedback">Umpan balik positif</option>
        </select>

        <button id="assign-task" type="button">
          Jalankan aktivitas
        </button>
      </section>

      <section class="team-section">
        <div class="section-heading">
          <div>
            <span>OUR TEAM</span>
            <h2>Tim Karyawan</h2>
          </div>

          <span>09 PERSONEL</span>
        </div>

        <div class="employee-grid">
          ${EMPLOYEE_PROFILES.map(renderEmployee).join("")}
        </div>
      </section>

      <section class="profile-panel" id="profile-panel">
        ${renderProfile(selectedEmployee)}
      </section>
    </main>

    <footer>
      ZORE AI · VIRTUAL OFFICE SYSTEM
    </footer>
  `;

  connectVirtualOffice();

  document.querySelectorAll("[data-select]").forEach(button => {
    button.addEventListener("click", () => {
      selectEmployee(button.dataset.select);
    });
  });

  const taskInput = document.querySelector("#task-input");

  taskInput.addEventListener("input", event => {
    taskDraft = event.target.value;
  });

  document.querySelector("#assign-task").addEventListener("click", event => {
    event.preventDefault();

    const title = (taskInput.value || taskDraft || "").trim();
    const employeeId = document.querySelector("#employee-select").value;

    if (!title) {
      alert("Masukkan tugas terlebih dahulu.");
      taskInput.focus();
      return;
    }

    taskDraft = "";
    currentTask = {
      title,
      description: ""
    };

    currentEvent = document.querySelector("#event-select").value;

    selectedEmployee = EMPLOYEE_PROFILES.find(
      person => person.id === employeeId
    ) || EMPLOYEE_PROFILES[0];

    render();
  });
}

render();
