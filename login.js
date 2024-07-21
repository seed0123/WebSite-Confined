function login(event) {
    event.preventDefault(); // Prevent the form from submitting

    // Get values from form
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Example of hardcoded valid credentials (replace with your actual logic)
    const validUsername = 'safety';
    const validPassword = 'password';

    // Check if username and password match the hardcoded credentials
    if (username === validUsername && password === validPassword) {
        // Login successful, set session storage and redirect to main page (index.html in this example)
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.removeItem('isLoggedOut');
        
        // Push new state to the history
        history.pushState(null, null, 'index.html');
        window.location.href = 'index.html';
    } else {
        // Login failed, show an error message (using SweetAlert2 for better UI)
        Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Invalid username or password!',
            confirmButtonText: 'OK'
        });
    }
}

// Function to check if the user is logged in (to be called from other pages)
function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const isLoggedOut = sessionStorage.getItem('isLoggedOut') === 'true';
    if (!isLoggedIn || isLoggedOut) {
        // Redirect to login page if not logged in or explicitly logged out
        window.location.href = 'login.html';
    }
}

// Function to logout
function logout() {
    sessionStorage.setItem('isLoggedIn', 'false');
    sessionStorage.setItem('isLoggedOut', 'true');

    // Replace the current history entry to avoid back navigation
    history.replaceState(null, null, 'login.html');
    window.location.replace('login.html');
}

// Check login status on page load
document.addEventListener('DOMContentLoaded', function() {
    const isLoginPage = window.location.pathname.endsWith('login.html');
    if (!isLoginPage) {
        checkLogin(); // Only check login if it's not the login page
    }
});

// Listen for popstate event to handle back button
window.addEventListener('popstate', function(event) {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const isLoggedOut = sessionStorage.getItem('isLoggedOut') === 'true';
    if (!isLoggedIn || isLoggedOut) {
        // Redirect to login page if not logged in or explicitly logged out
        window.location.href = 'login.html';
    }
});
