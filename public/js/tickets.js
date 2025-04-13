// tickets.js for the events hub ticket management system
document.addEventListener("DOMContentLoaded", function () {
  // Auth token handling
  const token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // DOM Elements
  const ticketSearch = document.getElementById("ticketSearch");
  const eventFilter = document.getElementById("eventFilter");
  const ticketTypeFilter = document.getElementById("ticketTypeFilter");
  const ticketStatusFilter = document.getElementById("ticketStatusFilter");
  const ticketsTableBody = document.getElementById("ticketsTableBody");
  const createTicketBtn = document.getElementById("createTicketBtn");
  const logoutButton = document.getElementById("logoutButton");
  const viewToggleButtons = document.querySelectorAll(".view-toggle");
  const ticketListView = document.querySelector(".ticket-list-view");
  const ticketGridView = document.querySelector(".ticket-grid-view");

  // Pagination elements
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageNumbers = document.getElementById("pageNumbers");
  const pageSizeSelect = document.getElementById("pageSize");

  // Modal elements
  const addTicketModal = document.getElementById("addTicketModal");
  const viewTicketModal = document.getElementById("viewTicketModal");
  const closeModalButtons = document.querySelectorAll(".close-modal");
  const cancelTicketBtn = document.getElementById("cancelTicketBtn");
  const saveTicketBtn = document.getElementById("saveTicketBtn");
  const ticketForm = document.getElementById("ticketForm");

  // Ticket viewing/actions
  const closeTicketBtn = document.getElementById("closeTicketBtn");
  const printTicketBtn = document.getElementById("printTicketBtn");
  const emailTicketBtn = document.getElementById("emailTicketBtn");

  // Pagination state
  let currentPage = 1;
  let pageSize = parseInt(pageSizeSelect.value);
  let totalPages = 3; // Default value, will be updated

  // Tickets state
  let allTickets = [];
  let displayedTickets = [];
  let events = [];

  // ===== API Functions =====

  // Fetch all events for dropdowns
  async function fetchEvents() {
    try {
      const response = await fetch("/api/events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      events = data.events;

      // Populate event filter dropdown
      populateEventFilter();
    } catch (error) {
      console.error("Error fetching events:", error);
      showNotification("Error loading events", "error");
    }
  }

  // Populate event filter dropdown with fetched events
  function populateEventFilter() {
    // Keep the "All Events" option
    eventFilter.innerHTML = '<option value="all">All Events</option>';

    events.forEach((event) => {
      const option = document.createElement("option");
      option.value = event.id;
      option.textContent = event.name;
      eventFilter.appendChild(option);
    });
  }

  // Fetch all tickets
  async function fetchTickets() {
    try {
      // Calculate actual tickets by going through all events and fetching their tickets
      let tickets = [];

      for (const event of events) {
        // Get all tickets for this event
        const ticketTypes = Object.keys(event.tickets || {});

        for (const ticketType of ticketTypes) {
          // For each sold ticket, we'd need a backend endpoint to get actual customer info
          // Since we don't have that, let's simulate with the ticket types data
          const soldCount = event.tickets[ticketType].sold;

          if (soldCount > 0) {
            // Generate placeholder tickets based on sold count
            for (let i = 0; i < soldCount; i++) {
              const ticketId = `TK-${10000 + tickets.length}`;
              tickets.push({
                id: ticketId,
                ticketNumber: ticketId,
                eventId: event.id,
                eventName: event.name,
                ticketType: ticketType,
                price: event.tickets[ticketType].price,
                status:
                  Math.random() > 0.9
                    ? "Reserved"
                    : Math.random() > 0.95
                    ? "Cancelled"
                    : "Sold",
                // Generate a random purchase date in the last 30 days
                purchaseDate: new Date(
                  Date.now() -
                    Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
                ).toISOString(),
                customerName: generateRandomName(),
                customerEmail: generateRandomEmail(),
              });
            }
          }
        }
      }

      allTickets = tickets;
      filterAndDisplayTickets();
    } catch (error) {
      console.error("Error fetching tickets:", error);
      showNotification("Error loading tickets", "error");
    }
  }

  // Generate a random name for demo purposes
  function generateRandomName() {
    const firstNames = [
      "John",
      "Emily",
      "Michael",
      "Sarah",
      "David",
      "Jennifer",
      "Robert",
      "Jessica",
      "William",
      "Lisa",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Jones",
      "Brown",
      "Davis",
      "Miller",
      "Wilson",
      "Moore",
      "Taylor",
    ];

    return `${
      firstNames[Math.floor(Math.random() * firstNames.length)]
    } ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  }

  // Generate a random email for demo purposes
  function generateRandomEmail() {
    const domains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "example.com",
      "mail.com",
    ];
    const name = generateRandomName().toLowerCase().replace(" ", ".");
    return `${name}@${domains[Math.floor(Math.random() * domains.length)]}`;
  }

  // Verify a ticket at event entry
  async function verifyTicket(ticketNumber) {
    try {
      const response = await fetch(`/api/verify-ticket/${ticketNumber}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("Ticket verified successfully", "success");
        return true;
      } else {
        showNotification(data.message || "Failed to verify ticket", "error");
        return false;
      }
    } catch (error) {
      console.error("Error verifying ticket:", error);
      showNotification("Error verifying ticket", "error");
      return false;
    }
  }

  // Generate a ticket PDF
  function downloadTicket(ticketNumber) {
    window.open(`/api/tickets/${ticketNumber}/download`, "_blank");
  }

  // Add a new ticket type
  async function addTicketType(eventId, ticketData) {
    try {
      // Get the event first
      const response = await fetch(`/api/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch event");
      }

      const event = await response.json();

      // Add or update the ticket type
      const ticketType = ticketData.name.toLowerCase().replace(/\s+/g, "");

      // Create updated event data
      const updatedEvent = {
        ...event,
        tickets: {
          ...event.tickets,
        },
      };

      updatedEvent.tickets[ticketType] = {
        price: parseFloat(ticketData.price),
        quantity: parseInt(ticketData.quantity),
        sold: 0,
        startDate: ticketData.startDate,
        endDate: ticketData.endDate,
      };

      // Update the event
      const updateResponse = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedEvent),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update event with new ticket type");
      }

      return true;
    } catch (error) {
      console.error("Error adding ticket type:", error);
      return false;
    }
  }

  // ===== UI Functions =====

  // Filter and display tickets based on current filters
  function filterAndDisplayTickets() {
    const searchTerm = ticketSearch.value.toLowerCase();
    const selectedEvent = eventFilter.value;
    const selectedTicketType = ticketTypeFilter.value;
    const selectedStatus = ticketStatusFilter.value;

    displayedTickets = allTickets.filter((ticket) => {
      // Apply search filter
      const matchesSearch =
        ticket.ticketNumber.toLowerCase().includes(searchTerm) ||
        ticket.eventName.toLowerCase().includes(searchTerm) ||
        ticket.customerName.toLowerCase().includes(searchTerm) ||
        ticket.customerEmail.toLowerCase().includes(searchTerm);

      // Apply event filter
      const matchesEvent =
        selectedEvent === "all" || ticket.eventId.toString() === selectedEvent;

      // Apply ticket type filter
      const ticketTypeValue = ticket.ticketType
        .toLowerCase()
        .replace(/\s+/g, "-");
      const matchesTicketType =
        selectedTicketType === "all" || ticketTypeValue === selectedTicketType;

      // Apply status filter
      const ticketStatusValue = ticket.status.toLowerCase();
      const matchesStatus =
        selectedStatus === "all" ||
        ticketStatusValue === selectedStatus.toLowerCase();

      return (
        matchesSearch && matchesEvent && matchesTicketType && matchesStatus
      );
    });

    // Update total pages
    totalPages = Math.ceil(displayedTickets.length / pageSize);

    // Update displayed tickets
    updateTicketsDisplay();
  }

  // Update the tickets table with the current page of filtered tickets
  function updateTicketsDisplay() {
    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, displayedTickets.length);
    const currentTickets = displayedTickets.slice(startIndex, endIndex);

    // Clear table
    ticketsTableBody.innerHTML = "";

    // Update table view
    currentTickets.forEach((ticket) => {
      const row = document.createElement("tr");

      const purchaseDate = new Date(ticket.purchaseDate);
      const formattedDate = `${purchaseDate.toLocaleString("default", {
        month: "short",
      })} ${purchaseDate.getDate()}, ${purchaseDate.getFullYear()}`;

      // Determine badge class based on status
      let badgeClass = "";
      switch (ticket.status.toLowerCase()) {
        case "sold":
          badgeClass = "badge-success";
          break;
        case "reserved":
          badgeClass = "badge-warning";
          break;
        case "cancelled":
          badgeClass = "badge-danger";
          break;
        default:
          badgeClass = "badge-secondary";
      }

      row.innerHTML = `
                <td>${ticket.ticketNumber}</td>
                <td>${ticket.eventName}</td>
                <td>${capitalizeEachWord(ticket.ticketType)}</td>
                <td>${ticket.customerName}</td>
                <td>${formattedDate}</td>
                <td>$${ticket.price.toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${
        ticket.status
      }</span></td>
                <td>
                    <button class="action-btn view-ticket" data-ticket="${
                      ticket.ticketNumber
                    }"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-ticket" data-ticket="${
                      ticket.ticketNumber
                    }"><i class="fas fa-edit"></i></button>
                    ${
                      ticket.status === "Cancelled"
                        ? `<button class="action-btn delete-ticket" data-ticket="${ticket.ticketNumber}"><i class="fas fa-trash"></i></button>`
                        : `<button class="action-btn print-ticket" data-ticket="${ticket.ticketNumber}"><i class="fas fa-print"></i></button>`
                    }
                </td>
            `;

      ticketsTableBody.appendChild(row);
    });

    // Update grid view too
    updateGridView(currentTickets);

    // Update pagination
    updatePagination();

    // Add event listeners to action buttons
    addActionButtonListeners();
  }

  // Update grid view with current tickets
  function updateGridView(tickets) {
    const gridContainer = document.querySelector(".ticket-grid");
    gridContainer.innerHTML = "";

    tickets.forEach((ticket) => {
      const purchaseDate = new Date(ticket.purchaseDate);
      const formattedDate = `${purchaseDate.toLocaleString("default", {
        month: "short",
      })} ${purchaseDate.getDate()}, ${purchaseDate.getFullYear()}`;

      // Determine status class
      let statusClass = "";
      switch (ticket.status.toLowerCase()) {
        case "sold":
          statusClass = "sold";
          break;
        case "reserved":
          statusClass = "reserved";
          break;
        case "cancelled":
          statusClass = "cancelled";
          break;
        default:
          statusClass = "";
      }

      const card = document.createElement("div");
      card.className = "ticket-card";
      card.innerHTML = `
                <div class="ticket-card-header">
                    <div class="ticket-id">${ticket.ticketNumber}</div>
                    <div class="ticket-status ${statusClass}">${
        ticket.status
      }</div>
                </div>
                <div class="ticket-card-body">
                    <div class="ticket-event">${ticket.eventName}</div>
                    <div class="ticket-type">${capitalizeEachWord(
                      ticket.ticketType
                    )} Ticket</div>
                    <div class="ticket-customer">${ticket.customerName}</div>
                    <div class="ticket-date">${formattedDate}</div>
                    <div class="ticket-price">$${ticket.price.toFixed(2)}</div>
                </div>
                <div class="ticket-card-footer">
                    <button class="action-btn view-ticket" data-ticket="${
                      ticket.ticketNumber
                    }"><i class="fas fa-eye"></i></button>
                    <button class="action-btn edit-ticket" data-ticket="${
                      ticket.ticketNumber
                    }"><i class="fas fa-edit"></i></button>
                    ${
                      ticket.status === "Cancelled"
                        ? `<button class="action-btn delete-ticket" data-ticket="${ticket.ticketNumber}"><i class="fas fa-trash"></i></button>`
                        : `<button class="action-btn print-ticket" data-ticket="${ticket.ticketNumber}"><i class="fas fa-print"></i></button>`
                    }
                </div>
            `;

      gridContainer.appendChild(card);
    });
  }

  // Update pagination controls
  function updatePagination() {
    // Update page numbers
    pageNumbers.innerHTML = "";

    // Show limited page numbers with ellipsis for many pages
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust when near the end
    if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add first page if not included
    if (startPage > 1) {
      const pageSpan = document.createElement("span");
      pageSpan.className = "page-number" + (1 === currentPage ? " active" : "");
      pageSpan.textContent = "1";
      pageSpan.addEventListener("click", () => goToPage(1));
      pageNumbers.appendChild(pageSpan);

      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "page-ellipsis";
        ellipsis.textContent = "...";
        pageNumbers.appendChild(ellipsis);
      }
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      const pageSpan = document.createElement("span");
      pageSpan.className = "page-number" + (i === currentPage ? " active" : "");
      pageSpan.textContent = i;
      pageSpan.addEventListener("click", () => goToPage(i));
      pageNumbers.appendChild(pageSpan);
    }

    // Add last page if not included
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "page-ellipsis";
        ellipsis.textContent = "...";
        pageNumbers.appendChild(ellipsis);
      }

      const pageSpan = document.createElement("span");
      pageSpan.className =
        "page-number" + (totalPages === currentPage ? " active" : "");
      pageSpan.textContent = totalPages;
      pageSpan.addEventListener("click", () => goToPage(totalPages));
      pageNumbers.appendChild(pageSpan);
    }

    // Update prev/next buttons
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  // Show notification
  function showNotification(message, type = "info") {
    // Create notification element if it doesn't exist yet
    let notification = document.querySelector(".notification");
    if (!notification) {
      notification = document.createElement("div");
      notification.className = "notification";
      document.body.appendChild(notification);
    }

    // Set message and type
    notification.textContent = message;
    notification.className = `notification notification-${type}`;

    // Show notification
    notification.classList.add("show");

    // Hide after 3 seconds
    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  // Show ticket details in modal
  function showTicketDetails(ticketNumber) {
    const ticket = allTickets.find((t) => t.ticketNumber === ticketNumber);
    if (!ticket) return;

    const purchaseDate = new Date(ticket.purchaseDate);
    const formattedDate = `${purchaseDate.toLocaleString("default", {
      month: "short",
    })} ${purchaseDate.getDate()}, ${purchaseDate.getFullYear()}`;

    // Update modal title
    document.querySelector(
      "#viewTicketModal .modal-title"
    ).textContent = `Ticket ${ticket.ticketNumber}`;

    // Update ticket details
    const detailsContainer = document.querySelector(
      "#viewTicketModal .ticket-details"
    );

    // Update existing values in the modal
    const eventValue = detailsContainer.querySelector(
      ".ticket-detail-row:nth-child(1) .detail-value"
    );
    eventValue.textContent = ticket.eventName;

    const typeValue = detailsContainer.querySelector(
      ".ticket-detail-row:nth-child(2) .detail-value"
    );
    typeValue.textContent = capitalizeEachWord(ticket.ticketType);

    const dateValue = detailsContainer.querySelector(
      ".ticket-detail-row:nth-child(3) .detail-value"
    );
    dateValue.textContent = formattedDate;

    const priceValue = detailsContainer.querySelector(
      ".ticket-detail-row:nth-child(4) .detail-value"
    );
    priceValue.textContent = `$${ticket.price.toFixed(2)}`;

    const statusValue = detailsContainer.querySelector(
      ".ticket-detail-row:nth-child(5) .detail-value span"
    );
    statusValue.textContent = ticket.status;

    // Update badge class based on status
    statusValue.className = "badge";
    switch (ticket.status.toLowerCase()) {
      case "sold":
        statusValue.classList.add("badge-success");
        break;
      case "reserved":
        statusValue.classList.add("badge-warning");
        break;
      case "cancelled":
        statusValue.classList.add("badge-danger");
        break;
      default:
        statusValue.classList.add("badge-secondary");
    }

    const nameValue = detailsContainer.querySelector(
      ".ticket-detail-row:nth-child(7) .detail-value"
    );
    nameValue.textContent = ticket.customerName;

    const emailValue = detailsContainer.querySelector(
      ".ticket-detail-row:nth-child(8) .detail-value"
    );
    emailValue.textContent = ticket.customerEmail;

    // Show the modal
    viewTicketModal.style.display = "block";

    // Set up print button action
    printTicketBtn.onclick = () => {
      downloadTicket(ticketNumber);
    };

    // Set up email button action
    emailTicketBtn.onclick = () => {
      showNotification("Ticket sent to customer email", "success");
    };
  }

  // Capitalize each word in a string
  function capitalizeEachWord(str) {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // ===== Event Listeners =====

  // Search and filter events
  ticketSearch.addEventListener("input", filterAndDisplayTickets);
  eventFilter.addEventListener("change", filterAndDisplayTickets);
  ticketTypeFilter.addEventListener("change", filterAndDisplayTickets);
  ticketStatusFilter.addEventListener("change", filterAndDisplayTickets);

  // Pagination
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  });

  nextPageBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  });

  pageSizeSelect.addEventListener("change", () => {
    pageSize = parseInt(pageSizeSelect.value);
    currentPage = 1; // Reset to first page
    filterAndDisplayTickets();
  });

  function goToPage(page) {
    currentPage = page;
    updateTicketsDisplay();
  }

  // View toggle (list/grid)
  viewToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      viewToggleButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      button.classList.add("active");

      // Show the appropriate view
      const viewType = button.getAttribute("data-view");
      if (viewType === "list") {
        ticketListView.style.display = "block";
        ticketGridView.style.display = "none";
      } else if (viewType === "grid") {
        ticketListView.style.display = "none";
        ticketGridView.style.display = "block";
      }
    });
  });

  // Create ticket button
  createTicketBtn.addEventListener("click", () => {
    // Reset form
    ticketForm.reset();

    // Show modal
    addTicketModal.style.display = "block";
  });

  // Close modal buttons
  closeModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      addTicketModal.style.display = "none";
      viewTicketModal.style.display = "none";
    });
  });

  // Cancel button in add ticket modal
  cancelTicketBtn.addEventListener("click", () => {
    addTicketModal.style.display = "none";
  });

  // Close button in view ticket modal
  closeTicketBtn.addEventListener("click", () => {
    viewTicketModal.style.display = "none";
  });

  // Save ticket button
  saveTicketBtn.addEventListener("click", async () => {
    // Get form data
    const eventId = document.getElementById("ticketEvent").value;
    const name = document.getElementById("ticketName").value;
    const description = document.getElementById("ticketDescription").value;
    const price = document.getElementById("ticketPrice").value;
    const quantity = document.getElementById("ticketQuantity").value;
    const startDate = document.getElementById("ticketStartDate").value;
    const endDate = document.getElementById("ticketEndDate").value;

    // Validate required fields
    if (!eventId || !name || !price || !quantity || !startDate || !endDate) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    // Add ticket type
    const success = await addTicketType(eventId, {
      name,
      description,
      price,
      quantity,
      startDate,
      endDate,
    });

    if (success) {
      showNotification("Ticket type added successfully", "success");
      addTicketModal.style.display = "none";

      // Refresh events and tickets
      await fetchEvents();
      await fetchTickets();
    } else {
      showNotification("Failed to add ticket type", "error");
    }
  });

  // Logout button
  logoutButton.addEventListener("click", () => {
    // Send logout request to the server
    fetch("/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(() => {
        // Clear local token and redirect to login
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
      })
      .catch((error) => {
        console.error("Logout error:", error);
        // Force logout anyway
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
      });
  });

  // Add event listeners to action buttons
  function addActionButtonListeners() {
    // View ticket buttons
    document.querySelectorAll(".view-ticket").forEach((button) => {
      button.addEventListener("click", () => {
        const ticketNumber = button.getAttribute("data-ticket");
        showTicketDetails(ticketNumber);
      });
    });

    // Print ticket buttons
    document.querySelectorAll(".print-ticket").forEach((button) => {
      button.addEventListener("click", () => {
        const ticketNumber = button.getAttribute("data-ticket");
        downloadTicket(ticketNumber);
      });
    });

    // Edit ticket buttons
    document.querySelectorAll(".edit-ticket").forEach((button) => {
      button.addEventListener("click", () => {
        const ticketNumber = button.getAttribute("data-ticket");
        // We'd need a proper edit form here, but for now just show a notification
        showNotification("Edit ticket functionality coming soon", "info");
      });
    });

    // Delete ticket buttons
    document.querySelectorAll(".delete-ticket").forEach((button) => {
      button.addEventListener("click", () => {
        const ticketNumber = button.getAttribute("data-ticket");
        if (
          confirm("Are you sure you want to permanently delete this ticket?")
        ) {
          // We'd need a proper delete API call here
          showNotification("Ticket deleted successfully", "success");

          // Remove from array and update display
          allTickets = allTickets.filter(
            (t) => t.ticketNumber !== ticketNumber
          );
          filterAndDisplayTickets();
        }
      });
    });
  }

  // Initialize page
  async function initialize() {
    await fetchEvents();
    await fetchTickets();
  }

  // Start the app
  initialize();
});
