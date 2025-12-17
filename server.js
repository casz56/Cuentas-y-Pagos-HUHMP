/**
 * Backend para Visor de Tesorería (Node.js + SQL Server) - FIX v4
 *
 * Tu BD ya nos mostró los nombres reales de columnas:
 * - Beneficiary (nombre tercero)
 * - BeneficiaryIdentification (id tercero)
 * - BankName (banco)
 * - BankAccountNumber (cuenta)
 * - ConfirmationDate (fecha comprobante)  [también existen DocumentDate y TransactionDate]
 * - Value (valor)
 * - Detail (detalle)
 *
 * Dependencias:
 *   npm install express mssql cors
 *
 * Ejecución:
 *   node server.js
 *
 * Endpoint:
 *   GET /api/voucher-transactions?rangeStart=YYYY-MM-DD&rangeEnd=YYYY-MM-DD
 */

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER || 'Reportes',
  password: process.env.DB_PASSWORD || 'R3p0rt3s2020*-',
  server: process.env.DB_SERVER || '172.16.0.81',
  database: process.env.DB_NAME || 'VIE19',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  requestTimeout: 60000,
  connectionTimeout: 15000,
};

let pool;

// ===== Helpers fechas =====
function isISODateOnly(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function parseISODateOnlyLocal(iso) {
  return new Date(iso + 'T00:00:00');
}

// ===== Health =====
app.get('/health', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT 1 AS ok');
    res.json({ ok: true, db: result.recordset?.[0]?.ok === 1 });
  } catch (e) {
    res.status(503).json({ ok: false, message: 'DB no disponible', error: e.message });
  }
});

// ===== Endpoint principal =====
app.get('/api/voucher-transactions', async (req, res) => {
  try {
    const { rangeStart, rangeEnd } = req.query;

    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros: rangeStart y rangeEnd son obligatorios',
        hint: 'Ej: /api/voucher-transactions?rangeStart=2025-11-01&rangeEnd=2025-11-30',
      });
    }

    if (!isISODateOnly(rangeStart) || !isISODateOnly(rangeEnd)) {
      return res.status(400).json({
        success: false,
        message: 'Formato inválido. Use YYYY-MM-DD (ej: 2025-11-01)',
      });
    }

    const startDayInclusive = parseISODateOnlyLocal(rangeStart);
    const endDayInclusive = parseISODateOnlyLocal(rangeEnd);
    const endDayExclusive = new Date(endDayInclusive);
    endDayExclusive.setDate(endDayExclusive.getDate() + 1);

    // Campo de fecha por defecto: ConfirmationDate
    // Puedes cambiarlo sin tocar código con:
    //   set COL_FECHA=DocumentDate   (Windows CMD)
    //   $env:COL_FECHA="DocumentDate" (PowerShell)
    // o:
    //   export COL_FECHA=DocumentDate (Linux)
    const DATE_COL = process.env.COL_FECHA || 'ConfirmationDate';

    const query = `
      SELECT
        Beneficiary              AS [Tercero Nombre],
        BankName                 AS [Entidad Bancaria],
        BankAccountNumber        AS [No. Cuenta Banco],
        ${DATE_COL}              AS [Fecha del Comprobante],
        Value                    AS [Valor Pagado],
        Detail                   AS [Detalle del Pago],
        BeneficiaryIdentification AS [ID Tercero]
      FROM [VIE19].[Treasury].[VoucherTransaction]
      WHERE
        TRY_CONVERT(datetime2, ${DATE_COL}) >= @RangeStart
        AND TRY_CONVERT(datetime2, ${DATE_COL}) <  @RangeEndExclusive
      ORDER BY TRY_CONVERT(datetime2, ${DATE_COL}) DESC;
    `;

    const result = await pool.request()
      .input('RangeStart', sql.DateTime2, startDayInclusive)
      .input('RangeEndExclusive', sql.DateTime2, endDayExclusive)
      .query(query);

    return res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });

  } catch (err) {
    console.error('❌ Error en consulta SQL:', err);
    return res.status(500).json({
      success: false,
      message: 'Error de ejecución de consulta a base de datos',
      error: err.message,
    });
  }
});

// ===== Start =====
sql.connect(dbConfig)
  .then((connectedPool) => {
    pool = connectedPool;
    console.log(`✅ Conexión exitosa a SQL Server: ${dbConfig.server}/${dbConfig.database}`);
    app.listen(PORT, () => {
      console.log('----------------------------------------------------------');
      console.log(`✅ Servidor Backend corriendo en: http://localhost:${PORT}`);
      console.log('📝 Endpoints:');
      console.log('   GET /health');
      console.log('   GET /api/voucher-transactions?rangeStart=YYYY-MM-DD&rangeEnd=YYYY-MM-DD');
      console.log('----------------------------------------------------------');
      console.log(`ℹ️  Usando columna fecha: ${process.env.COL_FECHA || 'ConfirmationDate'}`);
    });
  })
  .catch((err) => {
    console.error(`❌ Error al conectar a SQL Server: ${err.message}`);
    process.exit(1);
  });
