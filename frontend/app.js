const API = "http://localhost:5000";
const token = localStorage.getItem("token");

let cropsData = [];
let currentPage = 1;
const rowsPerPage = 5;
let chart;
let monthlyChart;
let editId = null;

// 🔐 Protect page
if (!token) {
  window.location.href = "auth.html";
}

// ================= NAVIGATION =================
function show(sectionId) {
  document.querySelectorAll("section").forEach(sec => {
    sec.classList.remove("active");
  });
  document.getElementById(sectionId).classList.add("active");
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  window.location.href = "auth.html";
}

// ================= NOTIFICATION =================
function notify(msg, success = true) {
  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const box = document.createElement("div");
  box.className = "notification";
  if (!success) box.classList.add("error");

  box.innerText = msg;
  container.appendChild(box);

  setTimeout(() => box.remove(), 3000);
}

// ================= ADD =================
function addCrop() {
  fetch(API + "/add-crop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      crop_name: crop_name.value,
      land_area: land_area.value,
      season: season.value
    })
  })
  .then(res => res.json())
  .then(data => {
    notify(data.message);
    loadCrops();
  });
}

function addExpense() {
  fetch(API + "/add-expense", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      crop_id: exp_crop_id.value,
      type: exp_type.value,
      amount: exp_amount.value,
      date: exp_date.value
    })
  })
  .then(res => res.json())
  .then(data => notify(data.message));
}

function addIncome() {
  fetch(API + "/add-income", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      crop_id: inc_crop_id.value,
      quantity: quantity.value,
      price_per_unit: price.value,
      date: inc_date.value
    })
  })
  .then(res => res.json())
  .then(data => notify(data.message));
}

// ================= LOAD CROPS =================
function loadCrops() {
  const skeleton = document.getElementById("skeleton");
  if (skeleton) {
    skeleton.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      skeleton.innerHTML += '<div class="skeleton-row"></div>';
    }
  }

  fetch(API + "/crops", {
    headers: { "Authorization": token }
  })
  .then(res => res.json())
  .then(data => {
    if (skeleton) skeleton.innerHTML = "";
    cropsData = data;
    displayTable();
    setupPagination();
  });
}

// ================= TABLE =================
function displayTable() {
  const body = document.getElementById("cropBody");
  body.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const items = cropsData.slice(start, start + rowsPerPage);

  items.forEach(crop => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${crop.id}</td>
      <td>${crop.crop_name}</td>
      <td>${crop.season}</td>
      <td>
        <button onclick="getProfit(${crop.id})">📊</button>
        <button onclick="loadChart(${crop.id})">📈</button>
        <button onclick="openEditModal(${crop.id}, '${crop.crop_name}', '${crop.land_area}', '${crop.season}')">✏️</button>
        <button onclick="deleteCrop(${crop.id})">🗑️</button>
      </td>
    `;

    body.appendChild(row);
  });
}

// ================= PAGINATION =================
function setupPagination() {
  const pageCount = Math.ceil(cropsData.length / rowsPerPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;

    btn.onclick = () => {
      currentPage = i;
      displayTable();
    };

    pagination.appendChild(btn);
  }
}

// ================= SEARCH =================
function searchCrops() {
  const value = searchInput.value.toLowerCase();

  const filtered = cropsData.filter(crop =>
    crop.crop_name.toLowerCase().includes(value) ||
    crop.season.toLowerCase().includes(value)
  );

  displayFiltered(filtered);
}

function displayFiltered(data) {
  const body = document.getElementById("cropBody");
  body.innerHTML = "";

  data.forEach(crop => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${crop.id}</td>
      <td>${crop.crop_name}</td>
      <td>${crop.season}</td>
      <td>
        <button onclick="getProfit(${crop.id})">📊</button>
        <button onclick="loadChart(${crop.id})">📈</button>
        <button onclick="openEditModal(${crop.id}, '${crop.crop_name}', '${crop.land_area}', '${crop.season}')">✏️</button>
        <button onclick="deleteCrop(${crop.id})">🗑️</button>
      </td>
    `;

    body.appendChild(row);
  });
}

// ================= EDIT MODAL =================
function openEditModal(id, name, area, season) {
  editId = id;
  edit_name.value = name;
  edit_area.value = area;
  edit_season.value = season;
  editModal.classList.remove("hidden");
}

function closeModal() {
  editModal.classList.add("hidden");
}

function saveEdit() {
  fetch(API + "/update-crop/" + editId, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      crop_name: edit_name.value,
      land_area: edit_area.value,
      season: edit_season.value
    })
  })
  .then(res => res.json())
  .then(data => {
    notify(data.message);
    closeModal();
    loadCrops();
  });
}

// ================= DELETE =================
function deleteCrop(id) {
  if (!confirm("Delete this crop?")) return;

  fetch(API + "/delete-crop/" + id, {
    method: "DELETE",
    headers: { "Authorization": token }
  })
  .then(res => res.json())
  .then(data => {
    notify(data.message);
    loadCrops();
  });
}

// ================= PROFIT =================
function getProfit(id) {
  fetch(API + "/profit/" + id, {
    headers: { "Authorization": token }
  })
  .then(res => res.json())
  .then(data => {
    result.innerText =
      `Income: ${data.total_income} | Expense: ${data.total_expense} | Profit: ${data.profit}`;
  });
}

// ================= CHART =================
function loadChart(id) {
  fetch(API + "/profit/" + id, {
    headers: { "Authorization": token }
  })
  .then(res => res.json())
  .then(data => {
    const ctx = document.getElementById("profitChart");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Income", "Expense", "Profit"],
        datasets: [{
          data: [data.total_income, data.total_expense, data.profit]
        }]
      }
    });
  });
}

// ================= MONTHLY CHART =================
function loadMonthlyChart() {
  const id = chart_crop_id.value;

  fetch(API + "/monthly-stats/" + id, {
    headers: { "Authorization": token }
  })
  .then(res => res.json())
  .then(data => {
    const months = [...new Set([
      ...data.income.map(i => i.month),
      ...data.expense.map(e => e.month)
    ])];

    const incomeMap = {};
    const expenseMap = {};

    data.income.forEach(i => incomeMap[i.month] = i.income);
    data.expense.forEach(e => expenseMap[e.month] = e.expense);

    const incomeArr = months.map(m => incomeMap[m] || 0);
    const expenseArr = months.map(m => expenseMap[m] || 0);
    const profitArr = months.map((m, i) => incomeArr[i] - expenseArr[i]);

    const ctx = document.getElementById("monthlyChart");

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          { label: "Income 💰", data: incomeArr },
          { label: "Expense 💸", data: expenseArr },
          { label: "Profit 📈", data: profitArr }
        ]
      }
    });
  });
}

// ================= SIDEBAR =================
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("collapsed");

  localStorage.setItem(
    "sidebarCollapsed",
    sidebar.classList.contains("collapsed")
  );
}

if (localStorage.getItem("sidebarCollapsed") === "true") {
  document.querySelector(".sidebar").classList.add("collapsed");
}
function toggleProfileMenu() {
  document.getElementById("profileMenu").classList.toggle("hidden");
}

// optional: show email from token
function loadUser() {
  const email = localStorage.getItem("email");
  if (email) document.getElementById("userEmail").innerText = email;
}

loadUser();

function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-btn"></span>';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.getAttribute("data-text");
  }
}

function addCrop(btn) {
  setLoading(btn, true);

  fetch(API + "/add-crop", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      crop_name: crop_name.value,
      land_area: land_area.value,
      season: season.value
    })
  })
  .then(res => res.json())
  .then(data => {
    notify(data.message);
    loadCrops();
  })
  .finally(() => setLoading(btn, false));
}


// ================= DARK MODE =================
function toggleDark() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark")
  );
}

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

// ================= INIT =================
loadCrops();