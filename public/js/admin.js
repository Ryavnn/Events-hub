document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:5000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",  
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            window.location.href = "dashboard.html";  
        } else {
            alert(result.message);  
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Something went wrong. Please try again.");
    }
});
document.getElementById('logoutButton').addEventListener('click', async function() {
    try {
        // Send the POST request to logout
        const response = await fetch("http://localhost:5000/logout", {
            method: "POST",
            credentials: "include",  // Include session cookie for authentication
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);  // Show success message
            window.location.href = "login.html";  // Redirect to login page after logout
        } else {
            alert(result.message);  // If there's an issue with logout
        }
    } catch (error) {
        console.error("Logout error:", error);
        alert("Something went wrong. Please try again.");
    }
});
