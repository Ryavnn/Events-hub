// Add this to checkout.js or modify your existing checkout.js file

document.addEventListener('DOMContentLoaded', function() {
    // Get checkout data from localStorage
    const checkoutDataString = localStorage.getItem('checkoutData');
    
    if (!checkoutDataString) {
      // No checkout data found, redirect to home page
      window.location.href = '../mainpage/index.html';
      return;
    }
    
    const checkoutData = JSON.parse(checkoutDataString);
    
    // Display order summary
    displayOrderSummary(checkoutData);
    
    // Add event listener for checkout button
    const checkoutButton = document.querySelector('.checkout-button');
    checkoutButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Basic form validation
      const fullname = document.getElementById('fullname').value;
      const phone = document.getElementById('phone').value;
      const email = document.getElementById('email').value;
      const paymentMethod = document.querySelector('input[name="payment"]:checked');
      
      if (!fullname || !phone || !email) {
        displayMessage('Please fill in all required fields.', 'error');
        return;
      }
      
      if (!paymentMethod) {
        displayMessage('Please select a payment method.', 'error');
        return;
      }
      
      // If validation passes, simulate order submission
      displayMessage('Processing your order...', 'info');
      
      // Simulate API call with timeout
      setTimeout(function() {
        // Clear checkout data
        localStorage.removeItem('checkoutData');
        
        // Show success message
        displayMessage('Order placed successfully! You will receive a confirmation email shortly.', 'success');
        
        // After 3 seconds, redirect to home page
        setTimeout(function() {
          window.location.href = '../mainpage/index.html';
        }, 3000);
      }, 2000);
    });
  });
  
  // Function to display order summary
  function displayOrderSummary(checkoutData) {
    // Create and append order summary to the page
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'order-summary';
    
    // Create order summary HTML
    let summaryHTML = `
      <div class="section-title">Order Summary</div>
      <div class="event-summary">
        <h4>${checkoutData.eventDetails.title}</h4>
        <p>${checkoutData.eventDetails.date}</p>
        <p>${checkoutData.eventDetails.location}</p>
      </div>
      <div class="ticket-summary">
    `;
    
    // Add ticket details
    if (checkoutData.tickets.earlyBird > 0) {
      const earlyBirdTotal = checkoutData.tickets.earlyBird * checkoutData.eventDetails.tickets.earlyBird.price;
      summaryHTML += `
        <div class="summary-row">
          <span>Early Bird x ${checkoutData.tickets.earlyBird}</span>
          <span>$${earlyBirdTotal}</span>
        </div>
      `;
    }
    
    if (checkoutData.tickets.regular > 0) {
      const regularTotal = checkoutData.tickets.regular * checkoutData.eventDetails.tickets.regular.price;
      summaryHTML += `
        <div class="summary-row">
          <span>Regular x ${checkoutData.tickets.regular}</span>
          <span>$${regularTotal}</span>
        </div>
      `;
    }
    
    if (checkoutData.tickets.vip > 0) {
      const vipTotal = checkoutData.tickets.vip * checkoutData.eventDetails.tickets.vip.price;
      summaryHTML += `
        <div class="summary-row">
          <span>VIP x ${checkoutData.tickets.vip}</span>
          <span>$${vipTotal}</span>
        </div>
      `;
    }
    
    // Add total
    summaryHTML += `
      </div>
      <div class="summary-row grandtotal">
        <span>Total</span>
        <span>$${checkoutData.total}</span>
      </div>
    `;
    
    // Set HTML to summary div
    summaryDiv.innerHTML = summaryHTML;
    
    // Insert before checkout summary
    const checkoutSummary = document.querySelector('.checkout-summary');
    checkoutSummary.insertBefore(summaryDiv, checkoutSummary.firstChild);
    
    // Update grandtotal display
    document.getElementById('grandtotal').textContent = `$${checkoutData.total}`;
  }
  
  // Function to display messages
  function displayMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
  }