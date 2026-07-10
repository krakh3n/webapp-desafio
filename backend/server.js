const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const app = express();

const logDir = 'logs';
if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
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
    max: 100,
    message: { error: 'Demasiadas peticiones desde esta IP.' }
});
app.use('/api/', limiter);

const USERS = [{
    username: 'admin',
    passwordHash: '$2a$10$JeDkXv8KBRA2JHV4hZcdv.D5ZWtLgouBvYisRWZn/tR9w7u.G3jAy' 
}];

app.get('/health', (req, res) => {
    logger.info('Healthcheck consultado de forma exitosa');
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

app.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const user = USERS.find(u => u.username === username);
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            logger.warn(`Intento de login fallido: ${username}`);
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        logger.info(`Sesión iniciada: ${username}`);
        return res.status(200).json({ token });
    } catch (error) {
        next(error);
    }
});

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                logger.warn('Token inválido o expirado');
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        logger.warn('Acceso denegado');
        res.sendStatus(401);
    }
};

app.get('/data', authenticateJWT, (req, res) => {
    logger.info(`Usuario ${req.user.username} consumiendo datos con rol limitado 'apidemo'`);
    res.status(200).json({ 
        message: "Datos de negocio expuestos bajo menor privilegio."
    });
});

app.use((err, req, res, next) => {
    logger.error(`Error interceptado: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Error interno en el servidor', trackingId: Date.now() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Servidor API seguro en puerto ${PORT}`);
});
