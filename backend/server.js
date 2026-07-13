const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const app = express();
const logDir = 'logs';
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ],
});

app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Configuración SQL Server
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
};

// Tracking simple en memoria para MVP
const activeUsers = new Set();
const startTime = Date.now();

// Inicialización de la DB y creación de admin por defecto
async function initializeDB() {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT COUNT(*) as count FROM Users");
        if (result.recordset[0].count === 0) {
            const hash = await bcrypt.hash('admin', 10);
            await pool.request()
                .input('user', sql.VarChar, 'admin')
                .input('hash', sql.VarChar, hash)
                .query("INSERT INTO Users (Username, PasswordHash, RequirePasswordChange) VALUES (@user, @hash, 1)");
            logger.info("Usuario 'admin' creado por defecto en la base de datos.");
        }
    } catch (err) {
        logger.error("Error conectando a SQL Server: " + err.message);
    }
}
initializeDB();

// 1. Endpoint de Login Refactorizado
app.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('user', sql.VarChar, username)
            .query("SELECT * FROM Users WHERE Username = @user");

        const user = result.recordset[0];
        if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (user.RequirePasswordChange) {
            return res.status(403).json({ 
                requirePasswordChange: true, 
                message: "Debe cambiar su contraseña por defecto.",
                tempUser: username 
            });
        }

        const token = jwt.sign({ username: user.Username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        activeUsers.add(user.Username);
        logger.info(`Sesión iniciada: ${username}`);
        return res.status(200).json({ token });
    } catch (error) {
        next(error);
    }
});

// 2. Endpoint de Cambio de Contraseña (Público temporal, validando login anterior)
app.post('/change-password', async (req, res, next) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('user', sql.VarChar, username)
            .query("SELECT * FROM Users WHERE Username = @user");
        
        const user = result.recordset[0];
        if (!user || !(await bcrypt.compare(currentPassword, user.PasswordHash))) {
            return res.status(401).json({ error: 'Credenciales actuales inválidas' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await pool.request()
            .input('hash', sql.VarChar, newHash)
            .input('user', sql.VarChar, username)
            .query("UPDATE Users SET PasswordHash = @hash, RequirePasswordChange = 0 WHERE Username = @user");
        
        logger.info(`Contraseña actualizada exitosamente para: ${username}`);
        res.status(200).json({ message: "Contraseña actualizada. Ya puede iniciar sesión." });
    } catch (error) {
        next(error);
    }
});

// Middleware JWT
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else res.sendStatus(401);
};

// 3. Endpoint del Dashboard
app.get('/dashboard', authenticateJWT, (req, res) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    // Leer últimos logs (MVP simple: lee archivo y toma ultimas 10 lineas)
    let recentLogs = [];
    try {
        const logData = fs.readFileSync(path.join(__dirname, 'logs/combined.log'), 'utf8');
        recentLogs = logData.trim().split('\n').slice(-10);
    } catch (e) {
        recentLogs = ["No se pudieron leer los logs."];
    }

    res.status(200).json({
        status: 'UP',
        uptime: `${uptimeSeconds} segundos`,
        activeUsersCount: activeUsers.size,
        logs: recentLogs
    });
});

app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Error interno en el servidor' });
});

app.listen(process.env.PORT || 3000, () => {
    logger.info(`API segura iniciada`);
});