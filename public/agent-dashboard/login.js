// Login Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.querySelector('.btn-text');
    const btnSpinner = document.querySelector('.btn-spinner');

    // Check if already logged in
    checkExistingSession();

    // Form submission
    loginForm.addEventListener('submit', handleLogin);

    // Input validation
    emailInput.addEventListener('blur', validateEmail);
    passwordInput.addEventListener('blur', validatePassword);

    // Clear errors on input
    emailInput.addEventListener('input', () => clearError('emailError'));
    passwordInput.addEventListener('input', () => clearError('passwordError'));

    async function checkExistingSession() {
        try {
            const isLoggedIn = await auth.init();
            if (isLoggedIn && auth.hasValidRole(auth.getCurrentUser().role)) {
                redirectToDashboard();
            }
        } catch (error) {
            console.log('No existing session found');
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        
        // Clear previous errors
        clearAllErrors();
        
        // Validate inputs
        if (!validateEmail() || !validatePassword()) {
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Show loading state
        setLoadingState(true);

        try {
            const result = await auth.login(email, password);
            
            if (result.success) {
                console.log('Login successful, user role:', result.user.role);
                
                // Redirect based on user role
                if (auth.isAdmin()) {
                    window.location.href = '/agent-dashboard/admin.html';
                } else {
                    // For AGENT and CUSTOMER roles, go to main dashboard
                    window.location.href = '/agent-dashboard/index.html';
                }
            } else {
                showError('loginError', result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('loginError', 'Login failed. Please try again.');
        }
        setLoadingState(false);
    }

    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showError('emailError', 'Email is required');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            showError('emailError', 'Please enter a valid email address');
            return false;
        }
        
        clearError('emailError');
        return true;
    }

    function validatePassword() {
        const password = passwordInput.value;
        
        if (!password) {
            showError('passwordError', 'Password is required');
            return false;
        }
        
        if (password.length < 6) {
            showError('passwordError', 'Password must be at least 6 characters');
            return false;
        }
        
        clearError('passwordError');
        return true;
    }

    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    function clearError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    function clearAllErrors() {
        ['emailError', 'passwordError', 'generalError'].forEach(clearError);
    }

    function showSuccess(message) {
        const generalError = document.getElementById('generalError');
        if (generalError) {
            generalError.textContent = message;
            generalError.style.color = '#38a169';
            generalError.style.display = 'block';
        }
    }

    function setLoadingState(loading) {
        loginBtn.disabled = loading;
        
        if (loading) {
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-block';
        } else {
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
        }
    }

    function redirectToDashboard() {
        const user = auth.getCurrentUser();
        if (user) {
            // Redirect based on role
            if (user.role === CONFIG.ROLES.ADMIN) {
                window.location.href = '/agent-dashboard/admin.html';
            } else {
                window.location.href = '/agent-dashboard/index.html';
            }
        }
    }

    // Handle Enter key in password field
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });

    // Demo credentials helper (remove in production)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const demoHelper = document.createElement('div');
        demoHelper.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; background: #f0f0f0; padding: 10px; border-radius: 8px; font-size: 12px; z-index: 1000;">
                <strong>Demo Credentials:</strong><br>
                Admin: admin@priyo.com / admin123<br>
                Agent: agent@priyo.com / agent123
            </div>
        `;
        document.body.appendChild(demoHelper);
    }
});
