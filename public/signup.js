document.getElementById('signupForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) throw new Error('Network response was not ok.');

        const result = await response.json();
        alert(result.message);
        window.location.href = 'login.html'; // Redirect to login page
    } catch (error) {
        console.error('Error:', error);
        alert('Sign up failed: ' + error.message);
    }
});
