const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');

const app = express();

// =============================================================================
// 1. CONFIGURACIÓN DE RED Y PUERTO (Basado en tu IP 172.16.19.151)
// =============================================================================
const PORT = 3000;
const HOST = '0.0.0.0'; // IMPORTANTE: '0.0.0.0' permite conexiones desde toda la red (Celulares, otros PC)

// =============================================================================
// 2. CONFIGURACIÓN DE LA BASE DE DATOS (SOLUCIÓN REAL)
// =============================================================================
// Reemplaza estos datos con las credenciales reales de tu servidor de Base de Datos del Hospital
const dbConfig = {
    user: 'Reportes',             // Tu usuario de base de datos
    password: 'R3p0rt3s2020*-', // Tu contraseña
    server: 'localhost',    // IP del servidor de base de datos (o '172.16.19.151' si es el mismo)
    database: 'NombreBD_Tesorería', // Nombre de la base de datos real
    options: {
        encrypt: false, // Usar true si estás en Azure
        trustServerCertificate: true // Usar true para desarrollo local/intranet
    }
};

// =============================================================================
// 3. MIDDLEWARE (SEGURIDAD Y ACCESO)
// =============================================================================
app.use(cors()); // Permite peticiones cruzadas (Vital para móviles)
app.use(express.json());

// Sirve tus archivos estáticos (el index.html) directamente
// Asegúrate de que index.html esté en la misma carpeta o en una carpeta 'public'
app.use(express.static(path.join(__dirname, '.'))); 

// =============================================================================
// 4. API ENDPOINT (CONSULTA EN VIVO)
// =============================================================================
app.get('/api/voucher-transactions', async (req, res) => {
    const { rangeStart, rangeEnd } = req.query;

    if (!rangeStart || !rangeEnd) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin.' });
    }

    try {
        // Conexión real a la BD por cada petición (o usar Pool global para producción alta)
        let pool = await sql.connect(dbConfig);

        // CONSULTA SQL REAL
        // Ajusta los nombres de tablas y columnas según tu esquema real del ERP
        const query = `
            SELECT 
                FECHA_COMPROBANTE as 'Fecha del Comprobante',
                NOMBRE_TERCERO as 'Tercero Nombre',
                NIT_TERCERO as 'ID Tercero',
                BANCO_NOMBRE as 'Entidad Bancaria',
                NUMERO_CUENTA as 'No. Cuenta Banco',
                DETALLE_GLOSA as 'Detalle del Pago',
                VALOR_TOTAL as 'Valor Pagado'
            FROM 
                TBL_COMPROBANTES_EGRESO
            WHERE 
                FECHA_COMPROBANTE BETWEEN @startDate AND @endDate
            ORDER BY 
                FECHA_COMPROBANTE DESC
        `;

        const result = await pool.request()
            .input('startDate', sql.Date, new Date(rangeStart))
            .input('endDate', sql.Date, new Date(rangeEnd))
            .query(query);

        res.json({ data: result.recordset });

    } catch (err) {
        console.error('Error de Base de Datos:', err);
        
        // Manejo de error específico de conexión
        if (err.code === 'ESOCKET') {
            return res.status(500).json({ error: 'No se pudo conectar al servidor de Base de Datos.' });
        }
        
        res.status(500).json({ error: 'Error al consultar datos reales: ' + err.message });
    }
});

// =============================================================================
// 5. INICIAR SERVIDOR
// =============================================================================
app.listen(PORT, HOST, () => {
    console.log(`\n==================================================`);
    console.log(`✅ SERVIDOR EN LÍNEA (MODO PRODUCCIÓN)`);
    console.log(`==================================================`);
    console.log(`📡 Acceso Local:           http://localhost:${PORT}`);
    console.log(`📲 Acceso Red (Celulares): http://172.16.19.151:${PORT}`); // Tu IP Fija
    console.log(`==================================================\n`);
});