require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors()); // Permite peticiones desde tu HTML/JS
app.use(express.json());

// Configuración de la Base de Datos
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false, // Usualmente false para IPs locales/intranet como 172.x.x.x
        trustServerCertificate: true // Confiar en certificado local
    }
};

// ----------------------------------------------------
// RUTA API: Obtener transacciones (Ingeniería Inversa)
// ----------------------------------------------------
app.get('/api/transacciones', async (req, res) => {
    try {
        // Recibimos los parámetros RangeStart y RangeEnd desde el Frontend
        // Ejemplo de uso: /api/transacciones?start=2024-01-01&end=2024-01-31
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ error: 'Se requieren parámetros start y end (YYYY-MM-DD)' });
        }

        // Conexión al pool
        let pool = await sql.connect(dbConfig);

        // CONSULTA SQL (Traducción exacta de tu Power Query)
        // Note: En Power BI usaste "Table.SelectRows" con DocumentDate > RangeStart.
        // Aquí usamos parámetros SQL (@fechaInicio, @fechaFin) para evitar inyección SQL.
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
                DocumentDate > @fechaInicio 
                AND DocumentDate <= @fechaFin
        `;

        const result = await pool.request()
            .input('fechaInicio', sql.Date, new Date(start))
            .input('fechaFin', sql.Date, new Date(end))
            .query(query);

        // Devolver los datos en formato JSON
        res.json(result.recordset);

    } catch (err) {
        console.error('Error en la base de datos:', err);
        res.status(500).json({ error: 'Error interno del servidor al consultar datos.' });
    }
});

// Iniciar servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 Servidor Backend corriendo en http://localhost:${port}`);
});