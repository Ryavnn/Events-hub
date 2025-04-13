// DOM Elements
const addEventBtn = document.getElementById('addEventBtn');
const addEventModal = document.getElementById('addEventModal');
const closeModalBtn = document.querySelector('.close-modal');
const cancelEventBtn = document.getElementById('cancelEventBtn');
const saveEventBtn = document.getElementById('saveEventBtn');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const eventForm = document.getElementById('eventForm');
const chartActions = document.querySelectorAll('.chart-actions button');

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    setupEventListeners();
});

// Set up all event listeners
function setupEventListeners() {
  // ✅ Only nav-item logic inside the loop
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      const section = this.querySelector("span").textContent;
      if (section === "Dashboard") window.location.href = "dashboard.html";
      else if (section === "Events") window.location.href = "events.html";
      else if (section === "Tickets") window.location.href = "tickets.html";
      else if (section === "Customers") window.location.href = "customers.html";
      else if (section === "Reports") window.location.href = "reports.html";
    });
  });

  // ✅ Modal handlers
  addEventBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  cancelEventBtn.addEventListener("click", closeModal);
  saveEventBtn.addEventListener("click", saveEvent);

  // ✅ Close modal when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target === addEventModal) closeModal();
  });

  // ✅ Tab navigation
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab");
      switchTab(tabName);
    });
  });

  // ✅ Chart period toggles
  chartActions.forEach((button) => {
    button.addEventListener("click", function () {
      chartActions.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");
      updateChartData(this.textContent);
    });
  });

  // ✅ Action buttons (edit, delete, etc.)
  const actionButtons = document.querySelectorAll(".action-btn");
  actionButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      const action = this.querySelector("i").className;
      const eventRow = this.closest("tr");
      const eventName = eventRow.querySelector("td:first-child").textContent;

      if (action.includes("fa-edit")) editEvent(eventName);
      else if (action.includes("fa-chart-bar")) viewEventStats(eventName);
      else if (action.includes("fa-trash")) deleteEvent(eventName, eventRow);
      else if (action.includes("fa-download")) downloadEventReport(eventName);

      e.stopPropagation();
    });
  });
}


// Modal functions
function openModal() {
    addEventModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling while modal is open
}

function closeModal() {
    addEventModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    resetForm();
}

function resetForm() {
    eventForm.reset();
}

function saveEvent() {
    // Form validation
    if (!eventForm.checkValidity()) {
        eventForm.reportValidity();
        return;
    }
    
    // Get form values
    const eventData = {
        name: document.getElementById('eventName').value,
        description: document.getElementById('eventDescription').value,
        venue: document.getElementById('eventVenue').value,
        address: document.getElementById('eventAddress').value,
        startDate: document.getElementById('eventStartDate').value,
        endDate: document.getElementById('eventEndDate').value,
        startTime: document.getElementById('eventStartTime').value,
        endTime: document.getElementById('eventEndTime').value,
        tickets: {
            earlyBird: {
                price: document.getElementById('earlyBirdPrice').value,
                quantity: document.getElementById('earlyBirdQuantity').value,
                startDate: document.getElementById('earlyBirdStartDate').value,
                endDate: document.getElementById('earlyBirdEndDate').value
            },
            regular: {
                price: document.getElementById('regularPrice').value,
                quantity: document.getElementById('regularQuantity').value,
                startDate: document.getElementById('regularStartDate').value,
                endDate: document.getElementById('regularEndDate').value
            },
            vip: {
                price: document.getElementById('vipPrice').value,
                quantity: document.getElementById('vipQuantity').value,
                startDate: document.getElementById('vipStartDate').value,
                endDate: document.getElementById('vipEndDate').value
            }
        }
    };
    
    // In a real app, you would send this data to your backend
    console.log('Saving event:', eventData);
    
    // Add the event to the upcoming events table
    addEventToTable(eventData);
    
    // Close the modal
    closeModal();
    
    // Show success message
    showNotification('Event saved successfully!', 'success');
}

function addEventToTable(eventData) {
    // Format date for display
    const formattedDate = formatEventDate(eventData.startDate, eventData.endDate);
    
    // Create table row
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${eventData.name}</td>
        <td>${formattedDate}</td>
        <td>${eventData.venue}</td>
        <td>0/${getTotalTickets(eventData)}</td>
        <td><span class="badge badge-success">On Sale</span></td>
        <td>
            <button class="action-btn"><i class="fas fa-edit"></i></button>
            <button class="action-btn"><i class="fas fa-chart-bar"></i></button>
            <button class="action-btn"><i class="fas fa-trash"></i></button>
        </td>
    `;
    
    // Add event listeners to the new buttons
    const buttons = tr.querySelectorAll('.action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const action = this.querySelector('i').className;
            const eventName = eventData.name;
            
            if (action.includes('fa-edit')) {
                editEvent(eventName);
            } else if (action.includes('fa-chart-bar')) {
                viewEventStats(eventName);
            } else if (action.includes('fa-trash')) {
                deleteEvent(eventName, tr);
            }
            
            e.stopPropagation();
        });
    });
    
    // Add to upcoming events table
    const upcomingTab = document.getElementById('upcoming-tab');
    const tbody = upcomingTab.querySelector('tbody');
    tbody.appendChild(tr);
    
    // Switch to the upcoming tab
    switchTab('upcoming');
}

function getTotalTickets(eventData) {
    // Calculate total tickets from all ticket types
    let total = 0;
    if (eventData.tickets.earlyBird.quantity) total += parseInt(eventData.tickets.earlyBird.quantity);
    if (eventData.tickets.regular.quantity) total += parseInt(eventData.tickets.regular.quantity);
    if (eventData.tickets.vip.quantity) total += parseInt(eventData.tickets.vip.quantity);
    return total;
}

function formatEventDate(startDate, endDate) {
    const start = new Date(startDate);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    
    if (endDate) {
        const end = new Date(endDate);
        if (start.getTime() === end.getTime()) {
            return start.toLocaleDateString('en-US', options);
        } else {
            return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
        }
    } else {
        return start.toLocaleDateString('en-US', options);
    }
}

// Tab functionality
function switchTab(tabName) {
    // Update tab buttons
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update tab content
    tabContents.forEach(content => {
        if (content.id === `${tabName}-tab`) {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    });
}

// Event actions
function editEvent(eventName) {
    console.log(`Editing event: ${eventName}`);
    // In a real app, you would fetch the event data and populate the form
    openModal();
    document.getElementById('eventName').value = eventName;
    
    // Show info message
    showNotification(`Editing event: ${eventName}`, 'info');
}

function viewEventStats(eventName) {
    console.log(`Viewing stats for event: ${eventName}`);
    // In a real app, you would open a stats page or modal
    showNotification(`Statistics for ${eventName} would be displayed here`, 'info');
}

function deleteEvent(eventName, row) {
    if (confirm(`Are you sure you want to delete "${eventName}"?`)) {
        // Remove the row from the table
        row.remove();
        console.log(`Deleted event: ${eventName}`);
        showNotification(`Event "${eventName}" has been deleted`, 'danger');
    }
}

function downloadEventReport(eventName) {
    console.log(`Downloading report for: ${eventName}`);
    // In a real app, you would generate and download a report
    showNotification(`Report for "${eventName}" is being generated...`, 'info');
    
    // Simulate download after a delay
    setTimeout(() => {
        showNotification(`Report for "${eventName}" has been downloaded`, 'success');
    }, 2000);
}

// Notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
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
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: getNotificationColor(type),
        color: 'white',
        padding: '12px 20px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: '9999',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minWidth: '300px',
        transition: 'all 0.3s ease'
    });
    
    // Add close button event
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(notification);
    });
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.opacity = '0';
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
        case 'success': return '#22c55e'; // success
        case 'danger': return '#ef4444'; // danger
        case 'warning': return '#f59e0b'; // warning
        case 'info':
        default:
            return '#0ea5e9'; // info
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'danger': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info':
        default:
            return 'fa-info-circle';
    }
}

// Charts
function initCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        // If Chart.js is not loaded, dynamically load it
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js';
        script.onload = createCharts;
        document.head.appendChild(script);
    } else {
        createCharts();
    }
}

function createCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    window.revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Revenue',
                data: [12500, 19200, 15300, 18400, 22100, 28600, 32000],
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.raw.toLocaleString();
                        }
                    }
                }
            }
        }
    });
    
    // Ticket Types Pie Chart
    const ticketCtx = document.getElementById('ticketPieChart').getContext('2d');
    window.ticketChart = new Chart(ticketCtx, {
        type: 'doughnut',
        data: {
            labels: ['Regular', 'VIP', 'Early Bird'],
            datasets: [{
                data: [1850, 980, 1012],
                backgroundColor: [
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgba(14, 165, 233, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(34, 197, 94, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChartData(period) {
    // Update revenue chart based on selected period
    let labels, data;
    
    switch (period) {
        case 'Monthly':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            data = [75000, 85000, 92000, 124563, 110000, 105000, 130000, 142000, 108000, 95000, 88000, 118000];
            break;
        case 'Yearly':
            labels = ['2020', '2021', '2022', '2023', '2024', '2025'];
            data = [860000, 920000, 980000, 1150000, 1280000, 450000];
            break;
        case 'Weekly':
        default:
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            data = [12500, 19200, 15300, 18400, 22100, 28600, 32000];
            break;
    }
    
    if (window.revenueChart) {
        window.revenueChart.data.labels = labels;
        window.revenueChart.data.datasets[0].data = data;
        window.revenueChart.update();
    }
}

// Add responsive sidebar toggle for mobile devices
function initResponsiveSidebar() {
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'hamburger-menu';
    hamburgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
    
    // Style hamburger button
    Object.assign(hamburgerBtn.style, {
        display: 'none',
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        zIndex: '100',
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 12px',
        cursor: 'pointer'
    });
    
    document.body.appendChild(hamburgerBtn);
    
    // Add media query
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    function handleScreenChange(e) {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (e.matches) {
            // Mobile view
            hamburgerBtn.style.display = 'block';
            sidebar.style.transform = 'translateX(-100%)';
            sidebar.style.transition = 'transform 0.3s ease';
            mainContent.style.marginLeft = '0';
            
            hamburgerBtn.onclick = function() {
                if (sidebar.style.transform === 'translateX(-100%)') {
                    sidebar.style.transform = 'translateX(0)';
                } else {
                    sidebar.style.transform = 'translateX(-100%)';
                }
            };
            
            // Close sidebar when clicking outside
            document.addEventListener('click', function(e) {
                if (!sidebar.contains(e.target) && e.target !== hamburgerBtn) {
                    sidebar.style.transform = 'translateX(-100%)';
                }
            });
        } else {
            // Desktop view
            hamburgerBtn.style.display = 'none';
            sidebar.style.transform = 'translateX(0)';
            mainContent.style.marginLeft = '250px';
        }
    }
    
    // Initial check
    handleScreenChange(mediaQuery);
    
    // Add listener
    mediaQuery.addEventListener('change', handleScreenChange);
}

// Call responsive sidebar function
initResponsiveSidebar();