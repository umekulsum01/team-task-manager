const API = 'http://localhost:5000/api';

// ─── AUTH HELPERS ───────────────────────────────────────
function getToken() { return localStorage.getItem('token'); }
function getUser()  { return JSON.parse(localStorage.getItem('user') || '{}'); }

function checkAuth() {
  if (!getToken()) window.location.href = 'index.html';
  const u = getUser();
  const el = document.getElementById('username');
  if (el) el.textContent = u.name || '';
  // hide admin sections from members
  if (u.role !== 'admin') {
    document.querySelectorAll('#create-project-section, #create-task-section')
      .forEach(s => s && (s.style.display = 'none'));
  }
}

function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// ─── TAB SWITCH (LOGIN / SIGNUP) ────────────────────────
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  event.target.classList.add('active');
}

// ─── SIGNUP ─────────────────────────────────────────────
async function signup() {
  const name     = document.getElementById('signup-name').value;
  const email    = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const role     = document.getElementById('signup-role').value;
  const msg      = document.getElementById('signup-msg');

  const res  = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role })
  });
  const data = await res.json();

  if (res.ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user',  JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } else {
    msg.textContent = data.message;
  }
}

// ─── LOGIN ───────────────────────────────────────────────
async function login() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const msg      = document.getElementById('login-msg');

  const res  = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (res.ok) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user',  JSON.stringify(data.user));
    window.location.href = 'dashboard.html';
  } else {
    msg.textContent = data.message;
  }
}

// ─── DASHBOARD ───────────────────────────────────────────
async function loadDashboard() {
  const res   = await fetch(`${API}/tasks`, {
    headers: { 'Authorization': getToken() }
  });
  const tasks = await res.json();

  document.getElementById('total-tasks').textContent   = tasks.length;
  document.getElementById('done-tasks').textContent    = tasks.filter(t => t.status === 'done').length;
  document.getElementById('pending-tasks').textContent = tasks.filter(t => t.status !== 'done').length;

  const tbody = document.getElementById('recent-tasks');
  tbody.innerHTML = '';
  tasks.slice(0, 5).forEach(t => {
    tbody.innerHTML += `<tr>
      <td>${t.title}</td>
      <td>${t.project ? t.project.name : '-'}</td>
      <td class="status-${t.status}">${t.status}</td>
      <td>${t.dueDate ? t.dueDate.slice(0,10) : '-'}</td>
    </tr>`;
  });
  if (!tasks.length) tbody.innerHTML = '<tr><td colspan="4">No tasks yet!</td></tr>';
}

// ─── PROJECTS ────────────────────────────────────────────
async function loadProjects() {
  const res      = await fetch(`${API}/projects`, {
    headers: { 'Authorization': getToken() }
  });
  const projects = await res.json();
  const tbody    = document.getElementById('projects-list');
  tbody.innerHTML = '';

  projects.forEach(p => {
    const members = p.members.map(m => m.name).join(', ') || '-';
    const delBtn  = getUser().role === 'admin'
      ? `<button class="btn-delete" onclick="deleteProject('${p._id}')">Delete</button>`
      : '-';
    tbody.innerHTML += `<tr>
      <td>${p.name}</td>
      <td>${p.description || '-'}</td>
      <td>${members}</td>
      <td>${delBtn}</td>
    </tr>`;
  });
  if (!projects.length) tbody.innerHTML = '<tr><td colspan="4">No projects yet!</td></tr>';
}

async function loadUsersForSelect() {
  const res   = await fetch(`${API}/auth/users`, {
    headers: { 'Authorization': getToken() }
  });
  const users = await res.json();
  const sel   = document.getElementById('project-members');
  if (!sel) return;
  users.forEach(u => {
    sel.innerHTML += `<option value="${u._id}">${u.name} (${u.role})</option>`;
  });
}

async function createProject() {
  const name    = document.getElementById('project-name').value;
  const desc    = document.getElementById('project-desc').value;
  const sel     = document.getElementById('project-members');
  const members = Array.from(sel.selectedOptions).map(o => o.value);
  const msg     = document.getElementById('project-msg');

  const res  = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': getToken() },
    body: JSON.stringify({ name, description: desc, members })
  });
  const data = await res.json();

  if (res.ok) {
    msg.style.color = 'green';
    msg.textContent = 'Project created!';
    loadProjects();
  } else {
    msg.textContent = data.message;
  }
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  await fetch(`${API}/projects/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': getToken() }
  });
  loadProjects();
}

// ─── TASKS ───────────────────────────────────────────────
async function loadTasks() {
  const res   = await fetch(`${API}/tasks`, {
    headers: { 'Authorization': getToken() }
  });
  const tasks = await res.json();
  const tbody = document.getElementById('tasks-list');
  tbody.innerHTML = '';

  tasks.forEach(t => {
    const isAdmin = getUser().role === 'admin';
    const delBtn  = isAdmin
      ? `<button class="btn-delete" onclick="deleteTask('${t._id}')">Delete</button>`
      : '-';
    tbody.innerHTML += `<tr>
      <td>${t.title}</td>
      <td>${t.project ? t.project.name : '-'}</td>
      <td>${t.assignedTo ? t.assignedTo.name : '-'}</td>
      <td>
        <select class="status-select" onchange="updateStatus('${t._id}', this.value)">
          <option value="todo"       ${t.status==='todo'       ? 'selected':''}>Todo</option>
          <option value="inprogress" ${t.status==='inprogress' ? 'selected':''}>In Progress</option>
          <option value="done"       ${t.status==='done'       ? 'selected':''}>Done</option>
        </select>
      </td>
      <td>${t.dueDate ? t.dueDate.slice(0,10) : '-'}</td>
      <td>${delBtn}</td>
    </tr>`;
  });
  if (!tasks.length) tbody.innerHTML = '<tr><td colspan="6">No tasks yet!</td></tr>';
}

async function loadProjectsForSelect() {
  const res      = await fetch(`${API}/projects`, {
    headers: { 'Authorization': getToken() }
  });
  const projects = await res.json();
  const sel      = document.getElementById('task-project');
  if (!sel) return;
  projects.forEach(p => {
    sel.innerHTML += `<option value="${p._id}">${p.name}</option>`;
  });
}

async function loadUsersForSelect2() {
  const res   = await fetch(`${API}/auth/users`, {
    headers: { 'Authorization': getToken() }
  });
  const users = await res.json();
  const sel   = document.getElementById('task-assignee');
  if (!sel) return;
  users.forEach(u => {
    sel.innerHTML += `<option value="${u._id}">${u.name}</option>`;
  });
}

async function createTask() {
  const title    = document.getElementById('task-title').value;
  const desc     = document.getElementById('task-desc').value;
  const project  = document.getElementById('task-project').value;
  const assignedTo = document.getElementById('task-assignee').value;
  const dueDate  = document.getElementById('task-due').value;
  const msg      = document.getElementById('task-msg');

  const res  = await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': getToken() },
    body: JSON.stringify({ title, description: desc, project, assignedTo, dueDate })
  });
  const data = await res.json();

  if (res.ok) {
    msg.style.color = 'green';
    msg.textContent = 'Task created!';
    loadTasks();
  } else {
    msg.textContent = data.message;
  }
}

async function updateStatus(id, status) {
  await fetch(`${API}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': getToken() },
    body: JSON.stringify({ status })
  });
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await fetch(`${API}/tasks/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': getToken() }
  });
  loadTasks();
}