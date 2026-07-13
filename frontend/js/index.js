
        let tempUser = '';
        let tempPassword = ''; 
        let currentToken = '';
        let dashboardInterval;

        document.getElementById('login-btn').addEventListener('click', login) 
        document.getElementById('change-pwd-btn').addEventListener('click', changePassword);
        document.getElementById('logout-btn').addEventListener('click', logout);
        
        document.getElementById('password').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Evita comportamientos raros por defecto
                login();
            }
        });
        document.getElementById('username').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                login();
            }
        });

        document.getElementById('new-password').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                changePassword();
            }
        });

        const show = (id) => document.getElementById(id).classList.remove('hidden');
        const hide = (id) => document.getElementById(id).classList.add('hidden');

        async function login() {
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            const err = document.getElementById('login-error');
            
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();

            if (res.status === 403 && data.requirePasswordChange) {
                tempUser = data.tempUser;
                tempPassword = p; 
                document.getElementById('password').value = '';
                hide('login-view');
                show('change-pwd-view');
            } else if (res.ok) {
                currentToken = data.token;
                loadDashboard();
            } else {
                err.innerText = data.error || 'Error de conexión';
                show('login-error');
            }
        }

        async function changePassword() {
            const np = document.getElementById('new-password').value;
            const op = tempPassword; 
            const err = document.getElementById('pwd-error');

            const res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: tempUser, currentPassword: op, newPassword: np })
            });
            
            if (res.ok) {
                alert("Contraseña actualizada. Por favor, iniciá sesión.");
                document.getElementById('new-password').value = '';
                document.getElementById('password').value = '';
                tempPassword = ''; 
                hide('change-pwd-view');
                show('login-view');
            } else {
                const data = await res.json();
                err.innerText = data.error || 'Error al cambiar';
                show('pwd-error');
            }
        }

        async function loadDashboard() {
            hide('login-view');
            show('navbar');
            show('dashboard-view');
            fetchStats();
            dashboardInterval = setInterval(fetchStats, 3000);
        }

        async function fetchStats() {
            const res = await fetch('/api/dashboard', {
                headers: { 'Authorization': 'Bearer ' + currentToken }
            });
            if (res.ok) {
                const data = await res.json();
                document.getElementById('dash-status').innerText = data.status;
                document.getElementById('dash-uptime').innerText = data.uptime;
                document.getElementById('dash-users').innerText = data.activeUsersCount;
                
                const logsText = data.logs.map(l => {
                    try { return JSON.parse(l).message || l; } catch { return l; }
                }).join('\n');
                document.getElementById('dash-logs').innerText = logsText;
            } else if(res.status === 403 || res.status === 401) {
                logout();
            }
        }

        function logout() {
            currentToken = '';
            clearInterval(dashboardInterval);
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            hide('dashboard-view');
            hide('navbar');
            show('login-view');
        }