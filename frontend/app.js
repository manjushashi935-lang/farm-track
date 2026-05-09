const API = "https://farm-track-vm1g.onrender.com";
const token = localStorage.getItem("token");

let cropsData = [];
let currentPage = 1;
const rowsPerPage = 5;

let chart;
let monthlyChart;
let editId = null;

// ================= AUTH =================

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
  localStorage.removeItem("email");

  window.location.href = "auth.html";
}

// ================= NOTIFICATION =================

function notify(msg, success = true) {

  const container =
    document.getElementById("notificationContainer");

  if (!container) return;

  const box = document.createElement("div");

  box.className = "notification";

  if (!success) {
    box.classList.add("error");
  }

  box.innerText = msg;

  container.appendChild(box);

  setTimeout(() => {
    box.remove();
  }, 3000);
}

// ================= LOAD CROPS =================

function loadCrops() {

  const skeleton = document.getElementById("skeleton");

  if (skeleton) {

    skeleton.innerHTML = "";

    for (let i = 0; i < 5; i++) {

      skeleton.innerHTML += `
        <div class="skeleton-row"></div>
      `;
    }
  }

  fetch(API + "/crops", {

    headers: {
     "Authorization": "Bearer " + token
    }

  })

  .then(res => res.json())

  .then(data => {

    if (skeleton) {
      skeleton.innerHTML = "";
    }

    cropsData = data;

    displayTable();

    setupPagination();

  })

  .catch(err => {

    console.log(err);

    notify("Failed to load crops ❌", false);

  });
}

// ================= ADD CROP =================

function addCrop(btn) {

  if (btn) {
    setLoading(btn, true);
  }

  fetch(API + "/add-crop", {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },

    body: JSON.stringify({
      crop_name: crop_name.value,
      land_area: land_area.value,
      season: season.value
    })

  })

  .then(res => res.json())

  .then(data => {

    console.log(data);

    notify(data.message || "Crop Added 🌾");

    crop_name.value = "";
    land_area.value = "";
    season.value = "";

    loadCrops();

  })

  .catch(err => {

    console.log(err);

    notify("Crop Add Failed ❌", false);

  })

  .finally(() => {

    if (btn) {
      setLoading(btn, false);
    }

  });
}

// ================= ADD EXPENSE =================
function addExpense(btn) {

  if (btn) {
    setLoading(btn, true);
  }

  fetch(API + "/add-expense", {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },

    body: JSON.stringify({

      crop_id: exp_crop_id.value,

      type: exp_type.value,

      amount: exp_amount.value,

      date: exp_date.value

    })

  })

  .then(res => res.json())

  .then(data => {

    notify(data.message || "Expense Added 💸");

    exp_crop_id.value = "";
    exp_type.value = "";
    exp_amount.value = "";
    exp_date.value = "";

    // AUTO REFRESH HISTORY
    loadExpenses();

  })

  .catch(err => {

    console.log(err);

    notify("Expense Failed ❌", false);

  })

  .finally(() => {

    if (btn) {
      setLoading(btn, false);
    }

  });
}
// ================= ADD INCOME =================
function addIncome(btn) {

  if (btn) {
    setLoading(btn, true);
  }

  fetch(API + "/add-income", {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },

    body: JSON.stringify({

      crop_id: inc_crop_id.value,

      quantity: quantity.value,

      price_per_unit: price.value,

      date: inc_date.value

    })

  })

  .then(res => res.json())

  .then(data => {

    notify(data.message || "Income Added 💰");

    inc_crop_id.value = "";
    quantity.value = "";
    price.value = "";
    inc_date.value = "";

    // AUTO REFRESH HISTORY
    loadIncome();

  })

  .catch(err => {

    console.log(err);

    notify("Income Failed ❌", false);

  })

  .finally(() => {

    if (btn) {
      setLoading(btn, false);
    }

  });
}
// ================= TABLE =================

function displayTable() {

  const body =
    document.getElementById("cropBody");

  body.innerHTML = "";

  const start =
    (currentPage - 1) * rowsPerPage;

  const items =
    cropsData.slice(start, start + rowsPerPage);

  items.forEach(crop => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${crop.id}</td>
      <td>${crop.crop_name}</td>
      <td>${crop.season}</td>

      <td>

        <button onclick="getProfit(${crop.id})">
          📊
        </button>

        <button onclick="loadChart(${crop.id})">
          📈
        </button>

        <button onclick="
          openEditModal(
            ${crop.id},
            '${crop.crop_name}',
            '${crop.land_area}',
            '${crop.season}'
          )
        ">
          ✏️
        </button>

        <button onclick="deleteCrop(${crop.id})">
          🗑️
        </button>

      </td>
    `;

    body.appendChild(row);

  });
}

// ================= PAGINATION =================

function setupPagination() {

  const pagination =
    document.getElementById("pagination");

  pagination.innerHTML = "";

  const pageCount =
    Math.ceil(cropsData.length / rowsPerPage);

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

  const value =
    searchInput.value.toLowerCase();

  const filtered =
    cropsData.filter(crop =>

      crop.crop_name
      .toLowerCase()
      .includes(value)

      ||

      crop.season
      .toLowerCase()
      .includes(value)
    );

  displayFiltered(filtered);
}

function displayFiltered(data) {

  const body =
    document.getElementById("cropBody");

  body.innerHTML = "";

  data.forEach(crop => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${crop.id}</td>
      <td>${crop.crop_name}</td>
      <td>${crop.season}</td>

      <td>

        <button onclick="getProfit(${crop.id})">
          📊
        </button>

        <button onclick="loadChart(${crop.id})">
          📈
        </button>

        <button onclick="
          openEditModal(
            ${crop.id},
            '${crop.crop_name}',
            '${crop.land_area}',
            '${crop.season}'
          )
        ">
          ✏️
        </button>

        <button onclick="deleteCrop(${crop.id})">
          🗑️
        </button>

      </td>
    `;

    body.appendChild(row);

  });
}

// ================= EDIT =================

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
      "Authorization": "Bearer " + token
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

  if (!confirm("Delete crop?")) return;

  fetch(API + "/delete-crop/" + id, {

    method: "DELETE",

    headers: {
      "Authorization": "Bearer " + token
    }

  })

  .then(res => res.json())

  .then(data => {

    notify(data.message);

    loadCrops();

  });
}

// ================= PROFIT =================
function getProfit(id = null) {

  const cropId = id || profit_id.value;

  fetch(API + "/profit/" + cropId, {

    headers: {
      "Authorization": "Bearer " + token
    }

  })

  .then(res => res.json())

  .then(data => {

    console.log(data);

    result.innerHTML = `

      <div style="
        padding:15px;
        background:#f5f5f5;
        border-radius:10px;
        margin-top:10px;
      ">

        <h3>📊 Profit Report</h3>

        <p>💰 Total Income:
          <b>₹${data.total_income || 0}</b>
        </p>

        <p>💸 Total Expense:
          <b>₹${data.total_expense || 0}</b>
        </p>

        <p>📈 Net Profit:
          <b style="color:green;">
            ₹${data.profit || 0}
          </b>
        </p>

      </div>
    `;

  })

  .catch(err => {

    console.log(err);

    result.innerHTML =
      "Profit calculation failed ❌";

  });
}
// ================= PROFIT CHART =================

function loadChart(id) {

  fetch(API + "/profit/" + id, {

    headers: {
      "Authorization": "Bearer " + token
    }

  })

  .then(res => res.json())

  .then(data => {

    const ctx =
      document.getElementById("profitChart");

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(ctx, {

      type: "bar",

      data: {

        labels: [
          "Income",
          "Expense",
          "Profit"
        ],

        datasets: [{

          label: "Farm Analytics",

          data: [
            data.total_income,
            data.total_expense,
            data.profit
          ]

        }]
      }
    });

  });
}

// ================= MONTHLY CHART =================

function loadMonthlyChart() {

  const id = chart_crop_id.value;

  fetch(API + "/monthly-stats/" + id, {

    headers: {
      "Authorization": "Bearer " + token
    }

  })

  .then(res => res.json())

  .then(data => {

    const months = [

      ...new Set([

        ...data.income.map(i => i.month),

        ...data.expense.map(e => e.month)

      ])

    ];

    const incomeMap = {};
    const expenseMap = {};

    data.income.forEach(i => {
      incomeMap[i.month] = i.income;
    });

    data.expense.forEach(e => {
      expenseMap[e.month] = e.expense;
    });

    const incomeArr =
      months.map(m => incomeMap[m] || 0);

    const expenseArr =
      months.map(m => expenseMap[m] || 0);

    const profitArr =
      months.map((m, i) =>
        incomeArr[i] - expenseArr[i]
      );

    const ctx =
      document.getElementById("monthlyChart");

    if (monthlyChart) {
      monthlyChart.destroy();
    }

    monthlyChart = new Chart(ctx, {

      type: "line",

      data: {

        labels: months,

        datasets: [

          {
            label: "Income 💰",
            data: incomeArr
          },

          {
            label: "Expense 💸",
            data: expenseArr
          },

          {
            label: "Profit 📈",
            data: profitArr
          }

        ]
      }
    });

  });
}

// ================= SIDEBAR =================

function toggleSidebar() {

  const sidebar =
    document.querySelector(".sidebar");

  sidebar.classList.toggle("collapsed");

  localStorage.setItem(
    "sidebarCollapsed",
    sidebar.classList.contains("collapsed")
  );
}

if (
  localStorage.getItem("sidebarCollapsed")
  === "true"
) {

  document
    .querySelector(".sidebar")
    .classList.add("collapsed");
}

// ================= PROFILE =================

function toggleProfileMenu() {

  document
    .getElementById("profileMenu")
    .classList.toggle("hidden");
}

function loadUser() {

  const email =
    localStorage.getItem("email");

  if (email) {

    document.getElementById(
      "userEmail"
    ).innerText = email;
  }
}

loadUser();

// ================= BUTTON LOADING =================

function setLoading(btn, loading) {

  if (loading) {

    btn.disabled = true;

    btn.innerHTML =
      '<span class="spinner-btn"></span>';

  } else {

    btn.disabled = false;

    btn.innerHTML =
      btn.getAttribute("data-text");
  }
}

// ================= DARK MODE =================

function toggleDark() {

  document.body.classList.toggle("dark");

  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark")
  );
}

if (
  localStorage.getItem("darkMode")
  === "true"
) {

  document.body.classList.add("dark");
}
// ================= LOAD EXPENSES =================
function loadExpenses() {

  fetch(API + "/expenses", {

    headers: {
      "Authorization": "Bearer " + token
    }

  })

  .then(res => res.json())

  .then(data => {

    const body =
      document.getElementById("expenseBody");

    if (!body) return;

    body.innerHTML = "";

    if (data.length === 0) {

      body.innerHTML = `
        <tr>
          <td colspan="5">
            No expenses found
          </td>
        </tr>
      `;

      return;
    }

    data.forEach((exp, index) => {

      body.innerHTML += `

        <tr>

          <td>${index + 1}</td>

          <td>${exp.crop_id}</td>

          <td>${exp.type}</td>

          <td>₹${exp.amount}</td>

          <td>${exp.date}</td>

        </tr>

      `;
    });

  })

  .catch(err => {

    console.log(err);

    notify(
      "Failed to load expenses ❌",
      false
    );

  });
}
// ================= LOAD INCOME =================
function loadIncome() {

  fetch(API + "/income", {

    headers: {
      "Authorization": "Bearer " + token
    }

  })

  .then(res => res.json())

  .then(data => {

    const body =
      document.getElementById("incomeBody");

    if (!body) return;

    body.innerHTML = "";

    if (data.length === 0) {

      body.innerHTML = `
        <tr>
          <td colspan="6">
            No income found
          </td>
        </tr>
      `;

      return;
    }

    data.forEach((inc, index) => {

      body.innerHTML += `

        <tr>

          <td>${index + 1}</td>

          <td>${inc.crop_id}</td>

          <td>${inc.quantity}</td>

          <td>₹${inc.price_per_unit}</td>

          <td>₹${inc.total_amount}</td>

          <td>${inc.date}</td>

        </tr>

      `;
    });

  })

  .catch(err => {

    console.log(err);

    notify(
      "Failed to load income ❌",
      false
    );

  });
}
// ================= INIT =================

// ================= INIT =================

loadCrops();

loadExpenses();

loadIncome();