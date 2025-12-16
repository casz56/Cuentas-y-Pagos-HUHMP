/**
 * Backend para Visor de Tesorería (Migración de Power BI a Node.js)
 * * Dependencias necesarias:
 * npm install express mssql cors
 * * Ejecución:
 * node server.js
 */

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Habilitar CORS para que tu futuro HTML pueda pedir datos a este servidor
app.use(cors());
app.use(express.json());

// 1. Configuración de la conexión SQL
// CORRECCIÓN REALIZADA: Se han organizado las credenciales en los campos correctos.
const dbConfig = {
    user: 'Reportes',          // Usuario (Antes estaba en password)
    password: 'R3p0rt3s2020*-', // Contraseña real (Antes estaba en server)
    server: '172.16.0.81',     // IP del servidor (Recuperada de tu script original)
    database: 'VIE19',         // Base de datos
    options: {
        encrypt: false, 
        trustServerCertificate: true, 
        connectTimeout: 15000 
    }
};

// PRUEBA DE CONEXIÓN INICIAL (Diagnóstico)
sql.connect(dbConfig).then(pool => {
    if (pool.connected) {
        console.log(`✅ Conexión exitosa a la Base de Datos: ${dbConfig.database} en ${dbConfig.server}`);
    }
}).catch(err => {
    console.error('❌ ERROR CRÍTICO DE CONEXIÓN SQL:');
    console.error(`   Mensaje: ${err.message}`);
    console.error('👉 SOLUCIÓN: Verifica si el usuario "Reportes" es correcto o si debería ser "sa".');
});

// 2. Endpoint API: Obtener transacciones filtradas por fecha
// Ruta: GET http://localhost:3000/api/voucher-transactions?rangeStart=2023-01-01&rangeEnd=2023-12-31
app.get('/api/voucher-transactions', async (req, res) => {
    try {
        const { rangeStart, rangeEnd } = req.query;

        if (!rangeStart || !rangeEnd) {
            return res.status(400).json({ 
                error: "Faltan parámetros. Usa formato: ?rangeStart=YYYY-MM-DD&rangeEnd=YYYY-MM-DD" 
            });
        }

        let pool = await sql.connect(dbConfig);

        const query = `
            SELECT 
                Beneficiary AS [Tercero Nombre],
                BankName AS [Entidad Bancaria],
                BankAccountNumber AS [No. Cuenta Banco],
                ConfirmationDate AS [Fecha del Comprobante],
                Value AS [Valor Pagado],
                Detail AS [Detalle del Pago],
                BeneficiaryIdentification AS [ID Tercero]
            FROM 
                [VIE19].[Treasury].[VoucherTransaction]
            WHERE 
                DocumentDate > @RangeStart 
                AND DocumentDate <= @RangeEnd
            ORDER BY 
                ConfirmationDate DESC
        `;

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
            message: "Error de conexión o consulta a base de datos",
            error: err.message 
        });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`----------------------------------------------------------`);
    console.log(`✅ Servidor Backend corriendo en: http://localhost:${PORT}`);
    console.log(`📝 Endpoint listo: GET /api/voucher-transactions`);
    console.log(`----------------------------------------------------------`);
});