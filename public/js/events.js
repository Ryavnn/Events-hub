// Add this to a new file named events.js in your js folder

// Global variable to store events data from API
let eventsData = {};

// Initialize selected tickets and total
let selectedEvent = null;
let selectedTickets = {
  earlyBird: 0,
  regular: 0,
  vip: 0,
};
let totalAmount = 0;

// Add event listeners when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Get the modal element
  const modal = document.getElementById("event-modal");

  // Get the close button
  const closeButton = document.querySelector(".close-modal");

  // Close modal when clicking the close button
  closeButton.addEventListener("click", function () {
    modal.style.display = "none";
  });

  // Close modal when clicking outside the modal content
  window.addEventListener("click", function (e) {
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
  checkoutButton.addEventListener("click", function () {
    proceedToCheckout();
  });

  // Fetch and display events in the upcoming events section
  fetchAndDisplayEvents();
});

// Function to open the modal with event data
function openEventModal(eventId) {
  // Get event data
  const eventData = eventsData[eventId];
  if (!eventData) return;

  selectedEvent = eventId;

  // Reset selected tickets
  selectedTickets = {
    earlyBird: 0,
    regular: 0,
    vip: 0,
  };

  // Update modal content with event data
  document.getElementById("modal-event-title").textContent = eventData.name;
  document.getElementById("modal-event-image").src = `../images/aviary-event.jpeg`;
  document.getElementById("modal-event-description").textContent =
    eventData.description;
  document.getElementById(
    "modal-event-date"
  ).textContent = `Date: ${eventData.date}`;
  document.getElementById(
    "modal-event-location"
  ).textContent = `Location: ${eventData.location}`;

  // Update ticket prices
  document.getElementById(
    "early-bird-price"
  ).textContent = `$${eventData.tickets.earlyBird.price}`;
  document.getElementById(
    "regular-price"
  ).textContent = `$${eventData.tickets.regular.price}`;
  document.getElementById(
    "vip-price"
  ).textContent = `$${eventData.tickets.vip.price}`;

  // Reset ticket quantities
  document.getElementById("early-bird-quantity").value = 0;
  document.getElementById("regular-quantity").value = 0;
  document.getElementById("vip-quantity").value = 0;

  // Reset total
  updateTotal();

  // Show modal
  document.getElementById("event-modal").style.display = "block";
}

// Function to decrease ticket quantity
function decreaseQuantity(ticketType) {
  const inputElement = getQuantityInput(ticketType);
  if (inputElement.value > 0) {
    inputElement.value = parseInt(inputElement.value) - 1;
    selectedTickets[ticketType] = parseInt(inputElement.value);
    updateTotal();
  }
}

// Function to increase ticket quantity
function increaseQuantity(ticketType) {
  const inputElement = getQuantityInput(ticketType);
  if (parseInt(inputElement.value) < 10) {
    inputElement.value = parseInt(inputElement.value) + 1;
    selectedTickets[ticketType] = parseInt(inputElement.value);
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

// Function to update the total amount
function updateTotal() {
  if (!selectedEvent) return;

  const eventData = eventsData[selectedEvent];

  // Get quantities
  selectedTickets.earlyBird =
    parseInt(document.getElementById("early-bird-quantity").value) || 0;
  selectedTickets.regular =
    parseInt(document.getElementById("regular-quantity").value) || 0;
  selectedTickets.vip =
    parseInt(document.getElementById("vip-quantity").value) || 0;

  // Calculate total
  totalAmount =
    selectedTickets.earlyBird * eventData.tickets.earlyBird.price +
    selectedTickets.regular * eventData.tickets.regular.price +
    selectedTickets.vip * eventData.tickets.vip.price;

  // Update total display
  document.getElementById("total-amount").textContent = `$${totalAmount}`;

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

// Function to proceed to checkout
function proceedToCheckout() {
  if (!selectedEvent || totalAmount <= 0) return;

  // Save selected event and tickets to localStorage
  const checkoutData = {
    event: selectedEvent,
    eventDetails: eventsData[selectedEvent],
    tickets: selectedTickets,
    total: totalAmount,
  };

  localStorage.setItem("checkoutData", JSON.stringify(checkoutData));

  // Navigate to checkout page
  window.location.href = "checkout.html";
}

// Fetch and display events in the upcoming events section
function fetchAndDisplayEvents() {
  const API_BASE_URL = "http://127.0.0.1:5000/api"; // Backend API base URL

  fetch(`${API_BASE_URL}/events`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }
      return response.json();
    })
    .then((data) => {
      const events = data.events;
      const upcomingEventsGallery = document.querySelector(
        "#upcoming-events .event-gallery"
      );

      // Clear existing events
      upcomingEventsGallery.innerHTML = "";

      // Store events data in our global variable
      events.forEach((event) => {
        eventsData[event.id] = event;
      });

      // Add events dynamically
      events.forEach((event) => {
        const eventDiv = document.createElement("div");
        eventDiv.classList.add("event-item");
        eventDiv.setAttribute("data-event-id", event.id);

        const eventImage = document.createElement("img");
        eventImage.src = `../images/aviary-event.jpeg`;
        eventImage.alt = event.name;

        const eventTitle = document.createElement("h3");
        eventTitle.textContent = event.name;

        const eventDate = document.createElement("p");
        eventDate.textContent = event.date;

        eventDiv.appendChild(eventImage);



        // Add click event to open modal
        eventDiv.addEventListener("click", function (e) {
          e.preventDefault();
          const eventId = this.getAttribute("data-event-id");
          openEventModal(eventId);
        });

        upcomingEventsGallery.appendChild(eventDiv);
      });
    })
    .catch((error) => {
      console.error("Error fetching events:", error);
      // Display a fallback message or use mock data for development
      const upcomingEventsGallery = document.querySelector(
        "#upcoming-events .event-gallery"
      );
      upcomingEventsGallery.innerHTML =
        "<p>Unable to load events. Please try again later.</p>";
    });
}
