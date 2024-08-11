document.addEventListener('DOMContentLoaded', () => {
    const themeLink = document.getElementById('theme-link');
    const modeButtons = document.querySelectorAll('.mode-btn');

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');
            switchTheme(theme);
        });
    });

    function switchTheme(theme) {
        switch (theme) {
            case 'default':
                themeLink.href = 'styles.css';
                break;
            case 'ninja':
                themeLink.href = 'ninja-mode.css';
                break;
            case 'dark':
                themeLink.href = 'dark-mode.css'; // Add dark-mode.css for the Dark theme
                break;
            case 'daisy':
                themeLink.href = 'daisy-mode.css'; // Add daisy-mode.css for the Daisy theme
                break;
            case 'ocean':
                themeLink.href = 'ocean-mode.css'; // Add ocean-mode.css for the Ocean theme
                break;
            default:
                themeLink.href = 'styles.css';
        }
    }
});
