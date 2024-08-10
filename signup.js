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
        const data = await response.json();

        if (response.ok) {
            alert('User created successfully. You can now log in.');
            window.location.href = 'login.html'; // Redirect to login page
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});
