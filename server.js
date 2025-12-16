/**
 * Backend para Visor de Tesorería (Migración de Power BI a Node.js)
 *
 * Dependencias necesarias:
 * npm install express mssql cors
 *
 * Ejecución:
 * node server.js
 */

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Habilitar CORS para permitir solicitudes desde el frontend (localhost:port)
app.use(cors());
app.use(express.json());

// 1. Configuración de la conexión SQL (Credenciales basadas en la información proporcionada)
const dbConfig = {
    user: 'Reportes',          // Usuario de la base de datos
    password: 'R3p0rt3s2020*-', // Contraseña de la base de datos
    server: '172.16.0.81',     // IP del servidor SQL Server
    database: 'VIE19',         // Nombre de la base de datos
    options: {
        encrypt: false, 
        trustServerCertificate: true, // Necesario si no se usa un certificado SSL válido
        connectTimeout: 15000 
    }
};

// Variable global para almacenar el pool de conexión
let pool;

// 2. PRUEBA DE CONEXIÓN E INICIALIZACIÓN DEL SERVIDOR
// Conectar a la base de datos y luego iniciar Express
sql.connect(dbConfig).then(connectedPool => {
    pool = connectedPool;
    if (pool.connected) {
        console.log(`✅ Conexión exitosa a la base de datos SQL Server: ${dbConfig.server}/${dbConfig.database}`);
        // Iniciar el servidor Express solo si la conexión a la DB es exitosa
        app.listen(PORT, () => {
            console.log(`----------------------------------------------------------`);
            console.log(`✅ Servidor Backend corriendo en: http://localhost:${PORT}`);
            console.log(`📝 Endpoint listo: GET /api/voucher-transactions`);
            console.log(`----------------------------------------------------------`);
        });
    }
}).catch(err => {
    console.error(`❌ Error al conectar a la base de datos SQL Server: ${err.message}`);
    console.error(`Asegúrese de ejecutar 'npm install express mssql cors' y de que la IP (${dbConfig.server}) esté accesible.`);
    process.exit(1); // Detener la aplicación si no hay conexión a la DB
});


// 3. Endpoint para obtener las transacciones (Filtrado por Rango de Fechas)
app.get('/api/voucher-transactions', async (req, res) => {
    const { rangeStart, rangeEnd } = req.query;

    if (!pool || !pool.connected) {
        return res.status(503).json({ 
            success: false, 
            message: "Servicio de Base de Datos no disponible. Verifique la conexión." 
        });
    }

    if (!rangeStart || !rangeEnd) {
        return res.status(400).json({ 
            success: false, 
            message: "Faltan parámetros de fecha (rangeStart y rangeEnd son obligatorios)" 
        });
    }

    try {
        const query = `
            SELECT 
                BeneficiaryName AS [Tercero Nombre],
                BankName AS [Entidad Bancaria],
                BankAccountNumber AS [No. Cuenta Banco],
                ConfirmationDate AS [Fecha del Comprobante],
                Value AS [Valor Pagado],
                Detail AS [Detalle del Pago],
                BeneficiaryIdentification AS [ID Tercero]
            FROM 
                [VIE19].[Treasury].[VoucherTransaction]
            WHERE 
                DocumentDate >= @RangeStart 
                AND DocumentDate <= @RangeEnd
            ORDER BY 
                ConfirmationDate DESC
        `;

        // Ejecutar la consulta con parámetros para prevenir inyección SQL
        const result = await pool.request()
            .input('RangeStart', sql.Date, new Date(rangeStart))
            .input('RangeEnd', sql.Date, new Date(rangeEnd))
            .query(query);

        res.json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });

    } catch (err) {
        console.error("Error en la consulta SQL:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error de ejecución de consulta a base de datos",
            error: err.message 
        });
    }
});