// Add this to a new file named events.js in your js folder

// Event data - this would typically come from a database
const eventsData = {
    "gallery": {
      title: "Gallery Exhibition",
      description: "An exclusive exhibition featuring works from renowned contemporary artists from around the world.",
      date: "May 15, 2025",
      location: "National Art Center",
      image: "../images/gallery-event.png",
      tickets: {
        earlyBird: 25,
        regular: 35,
        vip: 75
      }
    },
    "aviary": {
      title: "Aviary Music Festival",
      description: "A weekend of amazing music featuring top artists across multiple genres.",
      date: "June 5-7, 2025",
      location: "Central Park",
      image: "../images/aviary-event.jpeg",
      tickets: {
        earlyBird: 45,
        regular: 65,
        vip: 120
      }
    },
    "shaka": {
      title: "Shaka Cultural Experience",
      description: "Immerse yourself in indigenous cultural performances, food, and art.",
      date: "April 20, 2025",
      location: "Cultural Heritage Center",
      image: "../images/shaka-event.jpeg",
      tickets: {
        earlyBird: 30,
        regular: 45,
        vip: 85
      }
    },
    "neighbourhood": {
      title: "Neighbourhood Festival",
      description: "A community celebration with local food, crafts, and entertainment for the whole family.",
      date: "July 12, 2025",
      location: "Downtown Plaza",
      image: "../images/neighbourhood-event.png",
      tickets: {
        earlyBird: 15,
        regular: 25,
        vip: 50
      }
    },
    "io": {
      title: "IO Tech Conference",
      description: "The premier technology conference showcasing the latest innovations and ideas.",
      date: "August 3-5, 2025",
      location: "Tech Convention Center",
      image: "../images/io-event.jpg",
      tickets: {
        earlyBird: 85,
        regular: 125,
        vip: 250
      }
    },
    "wadidegla": {
      title: "Wadi Degla Adventure",
      description: "A day of hiking, rock climbing and nature exploration in the beautiful Wadi Degla reserve.",
      date: "March 15, 2025 (Past)",
      location: "Wadi Degla Nature Reserve",
      image: "../images/wadidegla-event.png",
      tickets: {
        earlyBird: 20,
        regular: 30,
        vip: 60
      }
    },
    "groove": {
      title: "Groove Dance Competition",
      description: "Watch talented dancers compete in multiple categories or join the open floor sessions.",
      date: "February 28, 2025 (Past)",
      location: "City Dance Hall",
      image: "../images/groove-event.jpg",
      tickets: {
        earlyBird: 22,
        regular: 35,
        vip: 70
      }
    },
    "kiama": {
      title: "Kiama Food Festival",
      description: "Sample delicious cuisine from top chefs and local restaurants with live cooking demonstrations.",
      date: "January 25, 2025 (Past)",
      location: "Waterfront Pavilion",
      image: "../images/kiama-event.jpg",
      tickets: {
        earlyBird: 30,
        regular: 45,
        vip: 90
      }
    }
  };
  
  // Initialize selected tickets and total
  let selectedEvent = null;
  let selectedTickets = {
    earlyBird: 0,
    regular: 0,
    vip: 0
  };
  let totalAmount = 0;
  
  // Add event listeners when the DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Get the modal element
    const modal = document.getElementById('event-modal');
    
    // Get the close button
    const closeButton = document.querySelector('.close-modal');
    
    // Get all event links
    const eventLinks = document.querySelectorAll('.event-gallery a');
    
    // Add click event to each event link
    eventLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default navigation
        
        // Get event ID from the href
        const href = this.getAttribute('href');
        const eventId = href.split('/').pop().replace('.html', '');
        
        // Open modal with event data
        openEventModal(eventId);
      });
    });
    
    // Close modal when clicking the close button
    closeButton.addEventListener('click', function() {
      modal.style.display = 'none';
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    // Add event listeners for quantity buttons
    const minusButtons = document.querySelectorAll('.minus-btn');
    const plusButtons = document.querySelectorAll('.plus-btn');
    
    minusButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const ticketType = this.getAttribute('data-ticket-type');
        decreaseQuantity(ticketType);
      });
    });
    
    plusButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const ticketType = this.getAttribute('data-ticket-type');
        increaseQuantity(ticketType);
      });
    });
    
    // Add event listener for quantity inputs
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
      input.addEventListener('change', function() {
        updateTotal();
      });
    });
    
    // Add event listener for checkout button
    const checkoutButton = document.getElementById('proceed-to-checkout');
    checkoutButton.addEventListener('click', function() {
      proceedToCheckout();
    });
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
      vip: 0
    };
    
    // Update modal content with event data
    document.getElementById('modal-event-title').textContent = eventData.title;
    document.getElementById('modal-event-image').src = eventData.image;
    document.getElementById('modal-event-description').textContent = eventData.description;
    document.getElementById('modal-event-date').textContent = `Date: ${eventData.date}`;
    document.getElementById('modal-event-location').textContent = `Location: ${eventData.location}`;
    
    // Update ticket prices
    document.getElementById('early-bird-price').textContent = `$${eventData.tickets.earlyBird}`;
    document.getElementById('regular-price').textContent = `$${eventData.tickets.regular}`;
    document.getElementById('vip-price').textContent = `$${eventData.tickets.vip}`;
    
    // Reset ticket quantities
    document.getElementById('early-bird-quantity').value = 0;
    document.getElementById('regular-quantity').value = 0;
    document.getElementById('vip-quantity').value = 0;
    
    // Reset total
    updateTotal();
    
    // Show modal
    document.getElementById('event-modal').style.display = 'block';
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
    switch(ticketType) {
      case 'earlyBird':
        return document.getElementById('early-bird-quantity');
      case 'regular':
        return document.getElementById('regular-quantity');
      case 'vip':
        return document.getElementById('vip-quantity');
      default:
        return null;
    }
  }
  
  // Function to update the total amount
  function updateTotal() {
    if (!selectedEvent) return;
    
    const eventData = eventsData[selectedEvent];
    
    // Get quantities
    selectedTickets.earlyBird = parseInt(document.getElementById('early-bird-quantity').value) || 0;
    selectedTickets.regular = parseInt(document.getElementById('regular-quantity').value) || 0;
    selectedTickets.vip = parseInt(document.getElementById('vip-quantity').value) || 0;
    
    // Calculate total
    totalAmount = 
      (selectedTickets.earlyBird * eventData.tickets.earlyBird) +
      (selectedTickets.regular * eventData.tickets.regular) +
      (selectedTickets.vip * eventData.tickets.vip);
    
    // Update total display
    document.getElementById('total-amount').textContent = `$${totalAmount}`;
    
    // Enable/disable checkout button
    const checkoutButton = document.getElementById('proceed-to-checkout');
    if (totalAmount > 0) {
      checkoutButton.removeAttribute('disabled');
      checkoutButton.style.opacity = '1';
    } else {
      checkoutButton.setAttribute('disabled', 'disabled');
      checkoutButton.style.opacity = '0.5';
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
      total: totalAmount
    };
    
    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    
    // Navigate to checkout page
    window.location.href = 'checkout.html';
  }