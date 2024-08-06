document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) throw new Error('Network response was not ok.');

        const result = await response.json();
        localStorage.setItem('token', result.token);
        window.location.href = 'index.html'; // Redirect to the main chat page
    } catch (error) {
        console.error('Error:', error);
        alert('Login failed: ' + error.message);
    }
});
