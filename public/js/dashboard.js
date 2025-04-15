// Global state
let authToken = localStorage.getItem("authToken");
let currentEvents = [];
let dashboardStats = {
  totalRevenue: 0,
  ticketsSold: 0,
  activeEvents: 0,
  customers: 0,
};

// API endpoints
const API_BASE_URL = "http://localhost:5000";
const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/login`,
  EVENTS: `${API_BASE_URL}/api/events`,
  DASHBOARD: `${API_BASE_URL}/api/dashboard`,
  TICKETS: `${API_BASE_URL}/api/tickets`,
  VERIFY_TICKET: `${API_BASE_URL}/api/verify-ticket`,
};

// DOM Elements
const addEventBtn = document.getElementById("addEventBtn");
const addEventModal = document.getElementById("addEventModal");
const closeModalBtn = document.querySelector(".close-modal");
const cancelEventBtn = document.getElementById("cancelEventBtn");
const saveEventBtn = document.getElementById("saveEventBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const eventForm = document.getElementById("eventForm");
const chartActions = document.querySelectorAll(".chart-actions button");

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  checkAuthentication();
  initCharts();
  setupEventListeners();
  loadDashboardData();
  loadEvents();
  initResponsiveSidebar();
});

// Check if user is authenticated
function checkAuthentication() {
  if (!authToken) {
    // Redirect to login page
    window.location.href = "login.html";
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Navigation items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      const section = this.querySelector("span").textContent;
      if (section === "Dashboard") window.location.href = "dashboard.html";
      else if (section === "Events") window.location.href = "events.html";
      else if (section === "Tickets") window.location.href = "tickets.html";
      else if (section === "Customers") window.location.href = "customers.html";
      else if (section === "Reports") window.location.href = "reports.html";
      else if (section === "Logout") logout();
    });
  });

  // Modal handlers
  addEventBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  cancelEventBtn.addEventListener("click", closeModal);
  saveEventBtn.addEventListener("click", saveEvent);

  // Close modal when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target === addEventModal) closeModal();
  });

  // Tab navigation
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab");
      switchTab(tabName);
    });
  });

  // Chart period toggles
  chartActions.forEach((button) => {
    button.addEventListener("click", function () {
      chartActions.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");
      updateChartData(this.textContent);
    });
  });
}

// Load dashboard data
async function loadDashboardData() {
  try {
    const response = await fetch(API_ENDPOINTS.DASHBOARD, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
        return;
      }
      throw new Error("Failed to load dashboard data");
    }

    const data = await response.json();

    // Update global state
    dashboardStats = {
      totalRevenue: data.totalRevenue || 0,
      ticketsSold: data.ticketsSold || 0,
      activeEvents: data.activeEvents || 0,
      customers: data.customers || 0,
    };

    // Update the UI
    updateDashboardMetrics();

    // Update charts with real data
    if (window.revenueChart && data.revenueData) {
      updateRevenueChart(data.revenueData);
    }

    if (window.ticketChart && data.ticketTypeData) {
      updateTicketTypesChart(data.ticketTypeData);
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showNotification("Failed to load dashboard data", "danger");
  }
}

// Update dashboard metrics in the UI
function updateDashboardMetrics() {
  // Format currency
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  // Update the metrics in the UI
  document.querySelector(
    ".metric-card:nth-child(1) .metric-value"
  ).textContent = formatter.format(dashboardStats.totalRevenue);

  document.querySelector(
    ".metric-card:nth-child(2) .metric-value"
  ).textContent = dashboardStats.ticketsSold.toLocaleString();

  document.querySelector(
    ".metric-card:nth-child(3) .metric-value"
  ).textContent = dashboardStats.activeEvents.toLocaleString();

  document.querySelector(
    ".metric-card:nth-child(4) .metric-value"
  ).textContent = dashboardStats.customers.toLocaleString();
}

// Load events and populate tables
async function loadEvents() {
  try {
    const response = await fetch(API_ENDPOINTS.EVENTS, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
        return;
      }
      throw new Error("Failed to load events");
    }

    const data = await response.json();

    // Update global state
    currentEvents = data.events || [];

    // Clear existing events in tables
    clearEventTables();

    // Populate tables with events
    const ongoingEvents = currentEvents.filter(
      (event) => event.status === "Active"
    );
    const upcomingEvents = currentEvents.filter(
      (event) => event.status === "Upcoming"
    );
    const pastEvents = currentEvents.filter(
      (event) => event.status === "Completed"
    );

    populateEventTable("ongoing-tab", ongoingEvents);
    populateEventTable("upcoming-tab", upcomingEvents);
    populateEventTable("past-tab", pastEvents);

    // Add event listeners to action buttons
    setupEventActionButtons();
  } catch (error) {
    console.error("Error loading events:", error);
    showNotification("Failed to load events", "danger");
  }
}

// Clear all event tables
function clearEventTables() {
  document.querySelectorAll(".tab-content table tbody").forEach((tbody) => {
    tbody.innerHTML = "";
  });
}

// Populate an event table with data
function populateEventTable(tabId, events) {
  const tbody = document.querySelector(`#${tabId} table tbody`);

  if (!tbody) {
    console.error("Table body not found for tab:", tabId);
    return;
  }

  // Generate table rows
  events.forEach((event) => {
    const tr = document.createElement("tr");

    // Determine badge class
    let badgeClass = "badge-success";
    if (event.status === "Completed") {
      badgeClass = "badge-danger";
    } else if (event.ticketsSold / event.totalTickets > 0.8) {
      badgeClass = "badge-warning";
    }

    tr.innerHTML = `
            <td>${event.name}</td>
            <td>${event.date}</td>
            <td>${event.venue}</td>
            <td>${event.ticketsSold}/${event.totalTickets}</td>
            <td><span class="badge ${badgeClass}">${getStatusText(
      event
    )}</span></td>
            <td class="action-buttons">
                ${
                  event.status === "Completed"
                    ? `<button class="action-btn" data-action="view-stats" data-event-id="${event.id}"><i class="fas fa-chart-bar"></i></button>
                     <button class="action-btn" data-action="download-report" data-event-id="${event.id}"><i class="fas fa-download"></i></button>`
                    : `<button class="action-btn" data-action="edit" data-event-id="${event.id}"><i class="fas fa-edit"></i></button>
                     <button class="action-btn" data-action="view-stats" data-event-id="${event.id}"><i class="fas fa-chart-bar"></i></button>
                     <button class="action-btn" data-action="delete" data-event-id="${event.id}"><i class="fas fa-trash"></i></button>`
                }
            </td>
        `;

    tbody.appendChild(tr);
  });

  // Show empty state if no events
  if (events.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td colspan="6" class="text-center">
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No ${tabId.split("-")[0]} events found</p>
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  }
}

// Helper to get status text
function getStatusText(event) {
  if (event.status === "Completed") {
    return "Completed";
  } else if (event.status === "Upcoming") {
    return "On Sale";
  } else if (event.ticketsSold / event.totalTickets > 0.8) {
    return "Selling Fast";
  } else {
    return "Active";
  }
}

// Setup event listeners for action buttons
function setupEventActionButtons() {
  document.querySelectorAll(".action-btn").forEach((button) => {
    button.addEventListener("click", function (e) {
      const action = this.getAttribute("data-action");
      const eventId = this.getAttribute("data-event-id");
      const event = currentEvents.find((e) => e.id == eventId);

      if (!event) {
        console.error("Event not found:", eventId);
        return;
      }

      if (action === "edit") {
        editEvent(event);
      } else if (action === "view-stats") {
        viewEventStats(event);
      } else if (action === "delete") {
        deleteEvent(event);
      } else if (action === "download-report") {
        downloadEventReport(event);
      }

      e.stopPropagation();
    });
  });
}

// Modal functions
function openModal(event = null) {
  addEventModal.style.display = "block";
  document.body.style.overflow = "hidden"; // Prevent scrolling while modal is open

  // If editing an event, populate the form
  if (event) {
    populateEventForm(event);
  } else {
    resetForm();
  }
}

function closeModal() {
  addEventModal.style.display = "none";
  document.body.style.overflow = ""; // Restore scrolling
  resetForm();
}

function resetForm() {
  eventForm.reset();
  // Reset any hidden fields or custom state
  eventForm.setAttribute("data-event-id", "");

  // Reset ticket type fields visibility
  document.querySelectorAll(".ticket-type-section").forEach((section) => {
    section.style.display = "block";
  });
}

// Populate form for editing
function populateEventForm(event) {
  // Set form to edit mode
  eventForm.setAttribute("data-event-id", event.id);

  // Populate basic fields
  document.getElementById("eventName").value = event.name;
  document.getElementById("eventDescription").value = event.description || "";
  document.getElementById("eventVenue").value = event.venue;
  document.getElementById("eventAddress").value = event.address || "";
  document.getElementById("eventStartDate").value = event.startDate;
  document.getElementById("eventEndDate").value = event.endDate || "";
  document.getElementById("eventStartTime").value = event.startTime;
  document.getElementById("eventEndTime").value = event.endTime || "";

  // Populate ticket information
  const tickets = event.tickets || {};

  // Early Bird tickets
  if (tickets.earlyBird) {
    document.getElementById("earlyBirdPrice").value =
      tickets.earlyBird.price || "";
    document.getElementById("earlyBirdQuantity").value =
      tickets.earlyBird.quantity || "";
    document.getElementById("earlyBirdStartDate").value =
      tickets.earlyBird.startDate || "";
    document.getElementById("earlyBirdEndDate").value =
      tickets.earlyBird.endDate || "";
  } else {
    document.querySelector(
      '.ticket-type-section[data-type="earlyBird"]'
    ).style.display = "none";
  }

  // Regular tickets
  if (tickets.regular) {
    document.getElementById("regularPrice").value = tickets.regular.price || "";
    document.getElementById("regularQuantity").value =
      tickets.regular.quantity || "";
    document.getElementById("regularStartDate").value =
      tickets.regular.startDate || "";
    document.getElementById("regularEndDate").value =
      tickets.regular.endDate || "";
  } else {
    document.querySelector(
      '.ticket-type-section[data-type="regular"]'
    ).style.display = "none";
  }

  // VIP tickets
  if (tickets.vip) {
    document.getElementById("vipPrice").value = tickets.vip.price || "";
    document.getElementById("vipQuantity").value = tickets.vip.quantity || "";
    document.getElementById("vipStartDate").value = tickets.vip.startDate || "";
    document.getElementById("vipEndDate").value = tickets.vip.endDate || "";
  } else {
    document.querySelector(
      '.ticket-type-section[data-type="vip"]'
    ).style.display = "none";
  }
}

// Save event (create or update)
async function saveEvent() {
  // Form validation
  if (!eventForm.checkValidity()) {
    eventForm.reportValidity();
    return;
  }

  // Get event ID if in edit mode
  const eventId = eventForm.getAttribute("data-event-id");
  const isEditing = eventId !== "";

  // Get form values
  const eventData = {
    name: document.getElementById("eventName").value,
    description: document.getElementById("eventDescription").value,
    venue: document.getElementById("eventVenue").value,
    address: document.getElementById("eventAddress").value,
    startDate: document.getElementById("eventStartDate").value,
    endDate: document.getElementById("eventEndDate").value || null,
    startTime: document.getElementById("eventStartTime").value,
    endTime: document.getElementById("eventEndTime").value || null,
    tickets: {
      earlyBird: {
        price: document.getElementById("earlyBirdPrice").value || 0,
        quantity: document.getElementById("earlyBirdQuantity").value || 0,
        startDate: document.getElementById("earlyBirdStartDate").value || null,
        endDate: document.getElementById("earlyBirdEndDate").value || null,
      },
      regular: {
        price: document.getElementById("regularPrice").value || 0,
        quantity: document.getElementById("regularQuantity").value || 0,
        startDate: document.getElementById("regularStartDate").value || null,
        endDate: document.getElementById("regularEndDate").value || null,
      },
      vip: {
        price: document.getElementById("vipPrice").value || 0,
        quantity: document.getElementById("vipQuantity").value || 0,
        startDate: document.getElementById("vipStartDate").value || null,
        endDate: document.getElementById("vipEndDate").value || null,
      },
    },
  };

  try {
    const url = isEditing
      ? `${API_ENDPOINTS.EVENTS}/${eventId}`
      : API_ENDPOINTS.EVENTS;

    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${isEditing ? "update" : "create"} event`);
    }

    const result = await response.json();

    // Close the modal
    closeModal();

    // Show success message
    showNotification(
      `Event ${isEditing ? "updated" : "created"} successfully!`,
      "success"
    );

    // Refresh events
    loadEvents();

    // Refresh dashboard data
    loadDashboardData();
  } catch (error) {
    console.error("Error saving event:", error);
    showNotification(
      `Failed to ${isEditing ? "update" : "create"} event`,
      "danger"
    );
  }
}

// Event actions
async function editEvent(event) {
  console.log(`Editing event: ${event.name}`);
  openModal(event);
  showNotification(`Editing event: ${event.name}`, "info");
}

async function viewEventStats(event) {
  console.log(`Viewing stats for event: ${event.name}`);

  try {
    const response = await fetch(`${API_ENDPOINTS.EVENTS}/${event.id}/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load event statistics");
    }

    const data = await response.json();

    // In a real app, you would display these statistics in a modal or redirect to a stats page
    showNotification(
      `Statistics for ${event.name} loaded successfully`,
      "info"
    );

    // For now, just log the data
    console.log("Event statistics:", data);
  } catch (error) {
    console.error("Error loading event statistics:", error);
    showNotification("Failed to load event statistics", "danger");
  }
}

async function deleteEvent(event) {
  if (confirm(`Are you sure you want to delete "${event.name}"?`)) {
    try {
      const response = await fetch(`${API_ENDPOINTS.EVENTS}/${event.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      // Show success message
      showNotification(`Event "${event.name}" has been deleted`, "success");

      // Refresh the events list
      loadEvents();

      // Refresh dashboard data
      loadDashboardData();
    } catch (error) {
      console.error("Error deleting event:", error);
      showNotification("Failed to delete event", "danger");
    }
  }
}

async function downloadEventReport(event) {
  console.log(`Downloading report for: ${event.name}`);

  try {
    // Show loading notification
    showNotification(
      `Report for "${event.name}" is being generated...`,
      "info"
    );

    // Start download
    const response = await fetch(`${API_ENDPOINTS.EVENTS}/${event.id}/report`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to generate report");
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `event_report_${event.id}.pdf`;

    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Show success notification
    showNotification(
      `Report for "${event.name}" has been downloaded`,
      "success"
    );
  } catch (error) {
    console.error("Error downloading report:", error);
    showNotification("Failed to download report", "danger");
  }
}

// Tab functionality
function switchTab(tabName) {
  // Update tab buttons
  tabButtons.forEach((button) => {
    if (button.getAttribute("data-tab") === tabName) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });

  // Update tab content
  tabContents.forEach((content) => {
    if (content.id === `${tabName}-tab`) {
      content.style.display = "block";
    } else {
      content.style.display = "none";
    }
  });
}

// Charts
function initCharts() {
  // Check if Chart.js is loaded
  if (typeof Chart === "undefined") {
    // If Chart.js is not loaded, dynamically load it
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js";
    script.onload = createCharts;
    document.head.appendChild(script);
  } else {
    createCharts();
  }
}

function createCharts() {
  // Revenue Chart
  const revenueCtx = document.getElementById("revenueChart").getContext("2d");
  window.revenueChart = new Chart(revenueCtx, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Revenue",
          data: [0, 0, 0, 0, 0, 0, 0], // Will be populated with real data
          backgroundColor: "rgba(79, 70, 229, 0.2)",
          borderColor: "rgba(79, 70, 229, 1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value.toLocaleString();
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              return "$" + context.raw.toLocaleString();
            },
          },
        },
      },
    },
  });

  // Ticket Types Pie Chart
  const ticketCtx = document.getElementById("ticketPieChart").getContext("2d");
  window.ticketChart = new Chart(ticketCtx, {
    type: "doughnut",
    data: {
      labels: ["Regular", "VIP", "Early Bird"],
      datasets: [
        {
          data: [0, 0, 0], // Will be populated with real data
          backgroundColor: [
            "rgba(14, 165, 233, 0.8)",
            "rgba(239, 68, 68, 0.8)",
            "rgba(34, 197, 94, 0.8)",
          ],
          borderColor: [
            "rgba(14, 165, 233, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(34, 197, 94, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Update revenue chart with real data
function updateRevenueChart(data) {
  if (!window.revenueChart || !data) return;

  window.revenueChart.data.labels = data.labels;
  window.revenueChart.data.datasets[0].data = data.values;
  window.revenueChart.update();
}

// Update ticket types chart with real data
function updateTicketTypesChart(data) {
  if (!window.ticketChart || !data) return;

  window.ticketChart.data.labels = data.labels;
  window.ticketChart.data.datasets[0].data = data.values;
  window.ticketChart.update();
}

// Update chart data based on selected period
function updateChartData(period) {
  // This will be called when user clicks on Weekly/Monthly/Yearly buttons
  fetch(`${API_ENDPOINTS.DASHBOARD}/revenue?period=${period.toLowerCase()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load revenue data");
      return response.json();
    })
    .then((data) => {
      if (data.revenueData) {
        updateRevenueChart(data.revenueData);
      }
    })
    .catch((error) => {
      console.error("Error loading revenue data:", error);
      showNotification("Failed to load revenue data", "danger");
    });
}

// Authentication functions
async function login(username, password) {
  try {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();

    // Save token to local storage
    localStorage.setItem("authToken", data.token);
    authToken = data.token;

    // Redirect to dashboard
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Login error:", error);
    return false;
  }
}

function logout() {
  // Clear token from storage
  localStorage.removeItem("authToken");

  // Redirect to login page
  window.location.href = "login.html";
}

// Notifications
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;

  // Style the notification
  Object.assign(notification.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: getNotificationColor(type),
    color: "white",
    padding: "12px 20px",
    borderRadius: "4px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    zIndex: "9999",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minWidth: "300px",
    transition: "all 0.3s ease",
  });

  // Add close button event
  const closeBtn = notification.querySelector(".notification-close");
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(notification);
  });

  // Add to body
  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}

function getNotificationColor(type) {
  switch (type) {
    case "success":
      return "#22c55e"; // success
    case "danger":
      return "#ef4444"; // danger
    case "warning":
      return "#f59e0b"; // warning
    case "info":
    default:
      return "#0ea5e9"; // info
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case "success":
      return "fa-check-circle";
    case "danger":
      return "fa-exclamation-circle";
    case "warning":
      return "fa-exclamation-triangle";
    case "info":
    default:
      return "fa-info-circle";
  }
}

// Add responsive sidebar toggle for mobile devices
function initResponsiveSidebar() {
  const hamburgerBtn = document.createElement("button");
  hamburgerBtn.className = "hamburger-menu";
  hamburgerBtn.innerHTML = '<i class="fas fa-bars"></i>';

  // Style hamburger button
  Object.assign(hamburgerBtn.style, {
    display: "none",
    position: "fixed",
    top: "1rem",
    left: "1rem",
    zIndex: "100",
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "8px",
  });

  // Add event listener for toggling sidebar
  hamburgerBtn.addEventListener("click", () => {
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.toggle("open");
  });

  // Append the button to the body
  document.body.appendChild(hamburgerBtn);

  // Media query to show/hide the hamburger button
  const mediaQuery = window.matchMedia("(max-width: 768px)");

  function handleMediaQueryChange(e) {
    if (e.matches) {
      hamburgerBtn.style.display = "block";
    } else {
      hamburgerBtn.style.display = "none";
      const sidebar = document.querySelector(".sidebar");
      sidebar.classList.remove("open");
    }
  }

  // Initial check
  handleMediaQueryChange(mediaQuery);

  // Listen for media query changes
  mediaQuery.addEventListener("change", handleMediaQueryChange);
}
