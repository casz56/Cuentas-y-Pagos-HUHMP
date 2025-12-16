const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// 1. CONFIGURACIÓN DE BASE DE DATOS
// =============================================================================
// ⚠️ IMPORTANTE: Asegúrate de que estos datos son los REALES de tu servidor SQL
const dbConfig = {
    user: 'sa',             
    password: 'TuPasswordFuerte', 
    server: 'localhost',          
    database: 'NombreBD_Tesorería',
    options: {
        encrypt: false, 
        trustServerCertificate: true, // Crucial para evitar errores de certificado SSL local
        enableArithAbort: true
    }
};

// =============================================================================
// 2. MIDDLEWARE
// =============================================================================
app.use(cors()); 
app.use(express.json());

// Sirve el Frontend (index.html) automáticamente
app.use(express.static(path.join(__dirname, '.')));

// =============================================================================
// 3. FUNCIÓN DE CONEXIÓN ROBUSTA (PATRÓN SINGLETON)
// =============================================================================
const connectDB = async () => {
    try {
        // Si ya estamos conectados, no hacer nada
        if (sql.connected) return;

        // Cerrar cualquier conexión pendiente por si acaso
        await sql.close();
        
        // Crear nueva conexión
        await sql.connect(dbConfig);
        console.log('✅ Base de Datos Conectada Exitosamente');
    } catch (err) {
        console.error('❌ Error de conexión BD:', err.message);
        console.log('⚠️  Verifique credenciales en dbConfig (línea 13).');
    }
};

// Intentar conectar al arrancar el servidor
connectDB();

// =============================================================================
// 4. API ENDPOINT
// =============================================================================
app.get('/api/voucher-transactions', async (req, res) => {
    const { rangeStart, rangeEnd } = req.query;

    if (!rangeStart || !rangeEnd) {
        return res.status(400).json({ error: 'Faltan fechas de inicio/fin.' });
    }

    try {
        // Verificar conexión antes de consultar
        if (!sql.connected) {
            console.log('🔄 Intentando reconexión...');
            await connectDB();
        }

        const query = `
            SELECT 
                FECHA_COMPROBANTE as 'Fecha del Comprobante',
                NOMBRE_TERCERO as 'Tercero Nombre',
                NIT_TERCERO as 'ID Tercero',
                BANCO_NOMBRE as 'Entidad Bancaria',
                NUMERO_CUENTA as 'No. Cuenta Banco',
                DETALLE_GLOSA as 'Detalle del Pago',
                VALOR_TOTAL as 'Valor Pagado'
            FROM TBL_COMPROBANTES_EGRESO
            WHERE FECHA_COMPROBANTE BETWEEN @startDate AND @endDate
            ORDER BY FECHA_COMPROBANTE DESC
        `;

        // Usar la conexión global existente
        const result = await new sql.Request()
            .input('startDate', sql.Date, new Date(rangeStart))
            .input('endDate', sql.Date, new Date(rangeEnd))
            .query(query);

        res.json({ data: result.recordset });

    } catch (err) {
        console.error('❌ Error en consulta:', err.message);
        res.status(500).json({ error: 'Error al consultar BD: ' + err.message });
    }
});

// =============================================================================
// 5. ARRANQUE DEL SERVIDOR
// =============================================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`✅ SERVIDOR ACTIVO EN PUERTO ${PORT}`);
    console.log(`==================================================`);
    console.log(`🏠 Local:       http://localhost:${PORT}`);
    console.log(`🏢 Red:         http://172.16.19.151:${PORT}`);
    console.log(`🌐 Internet:    Para acceso externo, use ngrok.`);
    console.log(`==================================================\n`);
});