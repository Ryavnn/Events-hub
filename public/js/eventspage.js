// eventspage.js - Handles the Events page functionality

document.addEventListener("DOMContentLoaded", function () {
  // Initialize the events page
  loadEvents();
  setupEventListeners();
});

// Global variables for pagination
let currentPage = 1;
let pageSize = 10;
let totalEvents = 0;
let filteredEvents = [];

// API endpoint base URL - change this to match your server's URL
const API_BASE_URL = "http://127.0.0.1:5000/api";

// Setup event listeners
function setupEventListeners() {
  // Navigation - sidebar menu items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      if (this.querySelector("span").textContent === "Dashboard") {
        window.location.href = "dashboard.html";
      } else if (this.querySelector("span").textContent === "Tickets") {
        window.location.href = "tickets.html";
      } else if (this.querySelector("span").textContent === "Customers") {
        window.location.href = "customers.html";
      } else if (this.querySelector("span").textContent === "Reports") {
        window.location.href = "reports.html";
      }
    });
    const closeButton = document.querySelector(".close-modal");
    if (closeButton) {
      closeButton.addEventListener("click", function () {
        document.getElementById("event-modal").style.display = "none";
      });
    }

    // Close modal when clicking outside the modal content
    window.addEventListener("click", function (e) {
      const modal = document.getElementById("event-modal");
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });

    // Add event listeners for quantity buttons
    const minusButtons = document.querySelectorAll(".minus-btn");
    const plusButtons = document.querySelectorAll(".plus-btn");

    minusButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        const ticketType = this.getAttribute("data-ticket-type");
        decreaseQuantity(ticketType);
      });
    });

    plusButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        const ticketType = this.getAttribute("data-ticket-type");
        increaseQuantity(ticketType);
      });
    });

    // Add event listener for quantity inputs
    const quantityInputs = document.querySelectorAll(".quantity-input");
    quantityInputs.forEach((input) => {
      input.addEventListener("change", function () {
        updateTotal();
      });
    });

    // Add event listener for checkout button
    const checkoutButton = document.getElementById("proceed-to-checkout");
    if (checkoutButton) {
      checkoutButton.addEventListener("click", function () {
        proceedToCheckout();
      });
    }
  });

  // Search functionality
  document.getElementById("eventSearch").addEventListener("input", function () {
    currentPage = 1;
    loadEvents();
  });

  // Filter dropdowns
  document
    .getElementById("eventStatusFilter")
    .addEventListener("change", function () {
      currentPage = 1;
      loadEvents();
    });

  document
    .getElementById("eventDateFilter")
    .addEventListener("change", function () {
      currentPage = 1;
      loadEvents();
    });

  // Pagination controls
  document.getElementById("prevPage").addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      loadEvents();
    }
  });

  document.getElementById("nextPage").addEventListener("click", function () {
    if (currentPage * pageSize < totalEvents) {
      currentPage++;
      loadEvents();
    }
  });

  document.getElementById("pageSize").addEventListener("change", function () {
    pageSize = parseInt(this.value);
    currentPage = 1;
    loadEvents();
  });

  // Add Event button
  document.getElementById("addEventBtn").addEventListener("click", function () {
    openAddEventModal();
  });

  // "Create a new event" button in no events message
  document
    .getElementById("createEventBtn")
    .addEventListener("click", function () {
      openAddEventModal();
    });

  // Modal event handlers
  document.querySelector(".close-modal").addEventListener("click", function () {
    closeAddEventModal();
  });

  document
    .getElementById("cancelEventBtn")
    .addEventListener("click", function () {
      closeAddEventModal();
    });

  document
    .getElementById("saveEventBtn")
    .addEventListener("click", function () {
      saveEvent();
    });

  // Table header sorting
  document.querySelectorAll("th i.fa-sort").forEach((sortIcon) => {
    sortIcon.parentElement.addEventListener("click", function () {
      const column = this.textContent.trim().split(" ")[0].toLowerCase();
      sortEvents(column);
    });
  });

  // Logout functionality
  document
    .getElementById("logoutButton")
    .addEventListener("click", function () {
      logout();
    });
}

// Load events from the server
function loadEvents() {
  showLoader();

  // Get filter values
  const searchTerm = document.getElementById("eventSearch").value;
  const statusFilter = document.getElementById("eventStatusFilter").value;
  const dateFilter = document.getElementById("eventDateFilter").value;

  // Build query string
  const params = new URLSearchParams({
    page: currentPage,
    pageSize: pageSize,
    search: searchTerm,
    status: statusFilter,
    date: dateFilter,
  });

  // Make API request
  // Make API request
  fetch(`${API_BASE_URL}/events`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - redirect to login
          window.location.href = "login.html";
          throw new Error("Unauthorized");
        }
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Store data for pagination
      filteredEvents = data.events;
      totalEvents = data.totalEvents;

      // Update pagination
      updatePagination();

      // Display the events
      displayEvents(filteredEvents);

      hideLoader();
    })
    .catch((error) => {
      console.error("Error fetching events:", error);
      showNotification("Failed to load events. Please try again.", "error");
      hideLoader();

      // Show empty state
      document.getElementById("eventsTable").style.display = "none";
      document.getElementById("noEventsMessage").style.display = "block";
    });
}

// Display events in the table
function displayEvents(events) {
  const tableBody = document.getElementById("eventsTableBody");
  tableBody.innerHTML = "";

  if (events.length === 0) {
    document.getElementById("eventsTable").style.display = "none";
    document.getElementById("noEventsMessage").style.display = "block";
    return;
  }

  document.getElementById("eventsTable").style.display = "table";
  document.getElementById("noEventsMessage").style.display = "none";

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    const row = document.createElement("tr");

    // Format status badge
    let statusBadgeClass = "";
    switch (event.status.toLowerCase()) {
      case "active":
        statusBadgeClass = "badge-success";
        break;
      case "upcoming":
        statusBadgeClass = "badge-info";
        break;
      case "completed":
        statusBadgeClass = "badge-danger";
        break;
      case "cancelled":
        statusBadgeClass = "badge-secondary";
        break;
      case "selling fast":
        statusBadgeClass = "badge-warning";
        break;
      default:
        statusBadgeClass = "badge-info";
    }

    // Create row content
    row.innerHTML = `
            <td>${event.name}</td>
            <td>${event.date}</td>
            <td>${event.venue}</td>
            <td>${event.ticketsSold}/${event.totalTickets}</td>
            <td><span class="badge ${statusBadgeClass}">${
      event.status
    }</span></td>
            <td>$${event.revenue.toFixed(2)}</td>
            <td>
                <button class="action-btn edit-event" data-id="${
                  event.id
                }"><i class="fas fa-edit"></i></button>
                <button class="action-btn view-event" data-id="${
                  event.id
                }"><i class="fas fa-eye"></i></button>
                <button class="action-btn delete-event" data-id="${
                  event.id
                }"><i class="fas fa-trash"></i></button>
            </td>
        `;

    tableBody.appendChild(row);
  }

  // Add event listeners to action buttons
  document.querySelectorAll(".edit-event").forEach((btn) => {
    btn.addEventListener("click", function () {
      const eventId = this.getAttribute("data-id");
      editEvent(eventId);
    });
  });

  document.querySelectorAll(".view-event").forEach((btn) => {
    btn.addEventListener("click", function () {
      const eventId = this.getAttribute("data-id");
      viewEvent(eventId);
    });
  });

  document.querySelectorAll(".delete-event").forEach((btn) => {
    btn.addEventListener("click", function () {
      const eventId = this.getAttribute("data-id");
      deleteEvent(eventId);
    });
  });
}

// Sort events by column
function sortEvents(column) {
  let sortBy;

  // Map column name to backend sort field
  switch (column) {
    case "event":
    case "name":
      sortBy = "name";
      break;
    case "date":
      sortBy = "date";
      break;
    case "tickets":
    case "ticketssold":
      sortBy = "ticketsSold";
      break;
    case "revenue":
      sortBy = "revenue";
      break;
    default:
      sortBy = column;
  }

  // Get the current sort direction from a data attribute
  const th = document.querySelector(
    `th:nth-child(${getColumnIndex(column) + 1})`
  );
  let currentDir = th.getAttribute("data-sort-dir") || "none";

  // Toggle sort direction
  let sortDir;
  if (currentDir === "none" || currentDir === "desc") {
    sortDir = "asc";
  } else {
    sortDir = "desc";
  }

  // Reset all columns
  document.querySelectorAll("th").forEach((header) => {
    header.setAttribute("data-sort-dir", "none");
    const icon = header.querySelector("i.fa-sort");
    if (icon) {
      icon.className = "fas fa-sort";
    }
  });

  // Set new direction and update icon
  th.setAttribute("data-sort-dir", sortDir);
  const icon = th.querySelector("i.fa-sort");
  if (icon) {
    icon.className = sortDir === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
  }

  // Reload events with new sort parameters
  currentPage = 1;
  loadEvents();
}

// Helper function to get column index
function getColumnIndex(columnName) {
  const headers = document.querySelectorAll("th");
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].textContent.trim().toLowerCase().startsWith(columnName)) {
      return i;
    }
  }
  return 0;
}

// Update pagination controls
function updatePagination() {
  const totalPages = Math.ceil(totalEvents / pageSize);

  // Update prev/next buttons
  document.getElementById("prevPage").disabled = currentPage <= 1;
  document.getElementById("nextPage").disabled = currentPage >= totalPages;

  // Update page numbers
  const pageNumbers = document.getElementById("pageNumbers");
  pageNumbers.innerHTML = "";

  // Maximum number of page buttons to show
  const maxButtons = 5;

  // Calculate start and end page numbers
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  // Add page number buttons
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("span");
    pageButton.classList.add("page-number");

    if (i === currentPage) {
      pageButton.classList.add("active");
    }

    pageButton.textContent = i;
    pageButton.addEventListener("click", function () {
      currentPage = i;
      loadEvents();
    });

    pageNumbers.appendChild(pageButton);
  }
}

// Show loader while fetching data
function showLoader() {
  document.getElementById("eventsLoader").style.display = "flex";
}

// Hide loader when data is loaded
function hideLoader() {
  document.getElementById("eventsLoader").style.display = "none";
}

// Open the add event modal
function openAddEventModal() {
  // Reset form
  document.getElementById("eventForm").reset();
  document.getElementById("addEventModal").classList.add("show");

  // Set today's date as default
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("eventStartDate").value = today;
  document.getElementById("eventEndDate").value = today;

  // Update modal title
  document.querySelector(".modal-title").textContent = "Add New Event";

  // Update save button
  const saveBtn = document.getElementById("saveEventBtn");
  saveBtn.textContent = "Save Event";
  saveBtn.setAttribute("data-mode", "create");
  saveBtn.removeAttribute("data-id");
}

// Close the add event modal
function closeAddEventModal() {
  document.getElementById("addEventModal").classList.remove("show");
}

// Save event (create or update)
function saveEvent() {
  // Get form data
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
        price: parseFloat(document.getElementById("earlyBirdPrice").value) || 0,
        quantity:
          parseInt(document.getElementById("earlyBirdQuantity").value) || 0,
        startDate: document.getElementById("earlyBirdStartDate").value || null,
        endDate: document.getElementById("earlyBirdEndDate").value || null,
      },
      regular: {
        price: parseFloat(document.getElementById("regularPrice").value) || 0,
        quantity:
          parseInt(document.getElementById("regularQuantity").value) || 0,
        startDate: document.getElementById("regularStartDate").value || null,
        endDate: document.getElementById("regularEndDate").value || null,
      },
      vip: {
        price: parseFloat(document.getElementById("vipPrice").value) || 0,
        quantity: parseInt(document.getElementById("vipQuantity").value) || 0,
        startDate: document.getElementById("vipStartDate").value || null,
        endDate: document.getElementById("vipEndDate").value || null,
      },
    },
  };

  // Validate form
  if (!validateEventForm(eventData)) {
    return;
  }

  // Determine if creating or updating
  const saveBtn = document.getElementById("saveEventBtn");
  const mode = saveBtn.getAttribute("data-mode");
  const eventId = saveBtn.getAttribute("data-id");

  let url = `${API_BASE_URL}/events`;
  let method = "POST";

  if (mode === "update" && eventId) {
    url = `${API_BASE_URL}/events/${eventId}`;
    method = "PUT";
  }

  // Send request to server
  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(eventData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      showNotification(
        `Event ${mode === "create" ? "created" : "updated"} successfully`,
        "success"
      );
      closeAddEventModal();
      loadEvents();
    })
    .catch((error) => {
      console.error("Error saving event:", error);
      showNotification("Failed to save event. Please try again.", "error");
    });
}

// Validate event form data
function validateEventForm(eventData) {
  if (!eventData.name) {
    showNotification("Event name is required", "error");
    return false;
  }

  if (!eventData.venue) {
    showNotification("Venue is required", "error");
    return false;
  }

  if (!eventData.startDate) {
    showNotification("Start date is required", "error");
    return false;
  }

  if (!eventData.startTime) {
    showNotification("Start time is required", "error");
    return false;
  }

  // Check if at least one ticket type is defined
  const hasTickets =
    (eventData.tickets.earlyBird.price > 0 &&
      eventData.tickets.earlyBird.quantity > 0) ||
    (eventData.tickets.regular.price > 0 &&
      eventData.tickets.regular.quantity > 0) ||
    (eventData.tickets.vip.price > 0 && eventData.tickets.vip.quantity > 0);

  if (!hasTickets) {
    showNotification("At least one ticket type must be defined", "error");
    return false;
  }

  return true;
}

// Edit an existing event
function editEvent(eventId) {
  // Fetch event details
  fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((event) => {
      // Populate form with event details
      document.getElementById("eventName").value = event.name;
      document.getElementById("eventDescription").value =
        event.description || "";
      document.getElementById("eventVenue").value = event.venue;
      document.getElementById("eventAddress").value = event.address || "";
      document.getElementById("eventStartDate").value = event.startDate;
      document.getElementById("eventEndDate").value = event.endDate || "";
      document.getElementById("eventStartTime").value = event.startTime;
      document.getElementById("eventEndTime").value = event.endTime || "";

      // Populate ticket information
      if (event.tickets) {
        if (event.tickets.earlyBird) {
          document.getElementById("earlyBirdPrice").value =
            event.tickets.earlyBird.price || "";
          document.getElementById("earlyBirdQuantity").value =
            event.tickets.earlyBird.quantity || "";
          document.getElementById("earlyBirdStartDate").value =
            event.tickets.earlyBird.startDate || "";
          document.getElementById("earlyBirdEndDate").value =
            event.tickets.earlyBird.endDate || "";
        }

        if (event.tickets.regular) {
          document.getElementById("regularPrice").value =
            event.tickets.regular.price || "";
          document.getElementById("regularQuantity").value =
            event.tickets.regular.quantity || "";
          document.getElementById("regularStartDate").value =
            event.tickets.regular.startDate || "";
          document.getElementById("regularEndDate").value =
            event.tickets.regular.endDate || "";
        }

        if (event.tickets.vip) {
          document.getElementById("vipPrice").value =
            event.tickets.vip.price || "";
          document.getElementById("vipQuantity").value =
            event.tickets.vip.quantity || "";
          document.getElementById("vipStartDate").value =
            event.tickets.vip.startDate || "";
          document.getElementById("vipEndDate").value =
            event.tickets.vip.endDate || "";
        }
      }

      // Update modal title and button
      document.querySelector(".modal-title").textContent = "Edit Event";
      const saveBtn = document.getElementById("saveEventBtn");
      saveBtn.textContent = "Update Event";
      saveBtn.setAttribute("data-mode", "update");
      saveBtn.setAttribute("data-id", eventId);

      // Open modal
      document.getElementById("addEventModal").classList.add("show");
    })
    .catch((error) => {
      console.error("Error fetching event details:", error);
      showNotification(
        "Failed to load event details. Please try again.",
        "error"
      );
    });
}

// View event details
// Function to open event modal with event data
function viewEvent(eventId) {
  // Fetch event details from API
  fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((event) => {
      // Get the modal element
      const modal = document.getElementById("event-modal");
      if (!modal) {
        console.error("Modal element not found");
        return;
      }

      // Update modal content with event data
      document.getElementById("modal-event-title").textContent = event.name;

      // Set image source if available, otherwise use placeholder
      const imageElement = document.getElementById("modal-event-image");
      if (event.imageUrl) {
        imageElement.src = event.imageUrl;
      } else {
        imageElement.src = "../images/placeholder-event.jpg";
      }

      document.getElementById("modal-event-description").textContent =
        event.description || "No description available";
      document.getElementById("modal-event-date").textContent = `Date: ${
        event.startDate
      }${event.endDate ? ` - ${event.endDate}` : ""}`;
      document.getElementById(
        "modal-event-location"
      ).textContent = `Location: ${event.venue}`;

      // Update ticket prices
      const tickets = event.tickets || {};
      document.getElementById("early-bird-price").textContent = tickets
        .earlyBird?.price
        ? `$${tickets.earlyBird.price}`
        : "N/A";
      document.getElementById("regular-price").textContent = tickets.regular
        ?.price
        ? `$${tickets.regular.price}`
        : "N/A";
      document.getElementById("vip-price").textContent = tickets.vip?.price
        ? `$${tickets.vip.price}`
        : "N/A";

      // Reset ticket quantities
      document.getElementById("early-bird-quantity").value = 0;
      document.getElementById("regular-quantity").value = 0;
      document.getElementById("vip-quantity").value = 0;

      // Store the selected event ID
      modal.setAttribute("data-event-id", eventId);

      // Update total
      updateTotal();

      // Show modal
      modal.style.display = "block";
    })
    .catch((error) => {
      console.error("Error fetching event details:", error);
      showNotification(
        "Failed to load event details. Please try again.",
        "error"
      );
    });
}

// Add this function for handling ticket quantities and totals
function updateTotal() {
  const eventId = document
    .getElementById("event-modal")
    .getAttribute("data-event-id");
  if (!eventId) return;

  // Get quantities
  const earlyBirdQty =
    parseInt(document.getElementById("early-bird-quantity").value) || 0;
  const regularQty =
    parseInt(document.getElementById("regular-quantity").value) || 0;
  const vipQty = parseInt(document.getElementById("vip-quantity").value) || 0;

  // Get prices from displayed values
  const earlyBirdPrice =
    parseFloat(
      document.getElementById("early-bird-price").textContent.replace("$", "")
    ) || 0;
  const regularPrice =
    parseFloat(
      document.getElementById("regular-price").textContent.replace("$", "")
    ) || 0;
  const vipPrice =
    parseFloat(
      document.getElementById("vip-price").textContent.replace("$", "")
    ) || 0;

  // Calculate total
  const totalAmount =
    earlyBirdQty * earlyBirdPrice +
    regularQty * regularPrice +
    vipQty * vipPrice;

  // Update total display
  document.getElementById("total-amount").textContent = `$${totalAmount.toFixed(
    2
  )}`;

  // Enable/disable checkout button
  const checkoutButton = document.getElementById("proceed-to-checkout");
  if (totalAmount > 0) {
    checkoutButton.removeAttribute("disabled");
    checkoutButton.style.opacity = "1";
  } else {
    checkoutButton.setAttribute("disabled", "disabled");
    checkoutButton.style.opacity = "0.5";
  }
}

// Delete an event
function deleteEvent(eventId) {
  if (
    !confirm(
      "Are you sure you want to delete this event? This action cannot be undone."
    )
  ) {
    return;
  }

  fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      showNotification("Event deleted successfully", "success");
      loadEvents();
    })
    .catch((error) => {
      console.error("Error deleting event:", error);
      showNotification("Failed to delete event. Please try again.", "error");
    });
}

// Show notification
function showNotification(message, type = "info") {
  // Check if notification container exists
  let notificationContainer = document.getElementById("notificationContainer");

  if (!notificationContainer) {
    // Create notification container
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notificationContainer";
    notificationContainer.style.position = "fixed";
    notificationContainer.style.top = "20px";
    notificationContainer.style.right = "20px";
    notificationContainer.style.zIndex = "1000";
    document.body.appendChild(notificationContainer);
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification">&times;</button>
    `;

  // Add notification to container
  notificationContainer.appendChild(notification);

  // Add event listener to close button
  notification
    .querySelector(".close-notification")
    .addEventListener("click", function () {
      notification.remove();
    });

  // Auto close after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Get notification icon based on type
function getNotificationIcon(type) {
  switch (type) {
    case "success":
      return "fa-check-circle";
    case "error":
      return "fa-exclamation-circle";
    case "warning":
      return "fa-exclamation-triangle";
    default:
      return "fa-info-circle";
  }
}

// Log out
function logout() {
  fetch("/logout", {
    method: "POST",
    credentials: "include",
  })
    .then((response) => {
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error("Error logging out:", error);
      window.location.href = "login.html";
    });
}
// Function to decrease ticket quantity
function decreaseQuantity(ticketType) {
  const inputElement = getQuantityInput(ticketType);
  if (inputElement.value > 0) {
    inputElement.value = parseInt(inputElement.value) - 1;
    updateTotal();
  }
}

// Function to increase ticket quantity
function increaseQuantity(ticketType) {
  const inputElement = getQuantityInput(ticketType);
  if (parseInt(inputElement.value) < 10) {
    inputElement.value = parseInt(inputElement.value) + 1;
    updateTotal();
  }
}

// Helper function to get the input element for a ticket type
function getQuantityInput(ticketType) {
  switch (ticketType) {
    case "earlyBird":
      return document.getElementById("early-bird-quantity");
    case "regular":
      return document.getElementById("regular-quantity");
    case "vip":
      return document.getElementById("vip-quantity");
    default:
      return null;
  }
}

// Function to proceed to checkout
function proceedToCheckout() {
  const modal = document.getElementById("event-modal");
  const eventId = modal.getAttribute("data-event-id");
  if (!eventId) return;

  // Get quantities
  const earlyBirdQty = parseInt(document.getElementById("early-bird-quantity").value) || 0;
  const regularQty = parseInt(document.getElementById("regular-quantity").value) || 0;
  const vipQty = parseInt(document.getElementById("vip-quantity").value) || 0;

  // Get prices from displayed values
  const earlyBirdPrice = parseFloat(document.getElementById("early-bird-price").textContent.replace("$", "")) || 0;
  const regularPrice = parseFloat(document.getElementById("regular-price").textContent.replace("$", "")) || 0;
  const vipPrice = parseFloat(document.getElementById("vip-price").textContent.replace("$", "")) || 0;

  // Calculate total
  const totalAmount = 
    earlyBirdQty * earlyBirdPrice +
    regularQty * regularPrice +
    vipQty * vipPrice;

  if (totalAmount <= 0) return;

  // Save checkout data to localStorage
  const checkoutData = {
    eventId: eventId,
    eventName: document.getElementById("modal-event-title").textContent,
    tickets: {
      earlyBird: earlyBirdQty,
      regular: regularQty,
      vip: vipQty
    },
    prices: {
      earlyBird: earlyBirdPrice,
      regular: regularPrice,
      vip: vipPrice
    },
    total: totalAmount
  };

  localStorage.setItem("checkoutData", JSON.stringify(checkoutData));

  // Navigate to checkout page
  window.location.href = "checkout.html";
}
