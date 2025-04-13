document
  .getElementById("loginForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store the token in localStorage
        localStorage.setItem("authToken", result.token);
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
function logout() {
  // Clear the token from localStorage
  localStorage.removeItem("authToken");

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