const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');

const app = express();

// =============================================================================
// 1. CONFIGURACIÓN DEL SERVIDOR WEB
// =============================================================================
// Puerto estándar. Si lo subes a la nube (Azure/AWS/Render), ellos asignan el puerto automáticamente en process.env.PORT
const PORT = process.env.PORT || 3000; 
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces de red

// =============================================================================
// 2. CONFIGURACIÓN BASE DE DATOS (Mantenemos tus credenciales)
// =============================================================================
const dbConfig = {
    user: 'Reportes',
    password: 'R3p0rt3s2020*-', // <--- ASEGÚRATE DE QUE ESTA CONTRASEÑA SEA CORRECTA EN EL SERVIDOR REAL
    server: '172.16.0.42',          // 'localhost' es correcto si la BD está en la misma máquina que este script
    database: 'NombreBD_Tesorería',
    options: {
        encrypt: false, 
        trustServerCertificate: true
    }
};

// =============================================================================
// 3. MIDDLEWARE Y SEGURIDAD
// =============================================================================
app.use(cors()); // Permite acceso desde cualquier origen (útil para móviles)
app.use(express.json());

// --- SOLUCIÓN CLAVE: SERVIR EL FRONTEND DESDE AQUÍ ---
// Esto permite que al entrar a http://IP-DEL-SERVIDOR:3000 veas la página automáticamente.
// No necesitas abrir el archivo index.html manualmente.
app.use(express.static(path.join(__dirname, '.'))); 

// =============================================================================
// 4. API ENDPOINT (Rutas del Backend)
// =============================================================================
app.get('/api/voucher-transactions', async (req, res) => {
    const { rangeStart, rangeEnd } = req.query;

    console.log(`📡 Consulta recibida: ${rangeStart} a ${rangeEnd}`); // Log para depuración en consola del servidor

    if (!rangeStart || !rangeEnd) {
        return res.status(400).json({ error: 'Se requieren fechas de inicio y fin.' });
    }

    try {
        let pool = await sql.connect(dbConfig);

        // Consulta SQL optimizada
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
        console.error('❌ Error Base de Datos:', err.message); // Log detallado en servidor
        
        if (err.code === 'ESOCKET') {
            return res.status(500).json({ error: 'Fallo de conexión con SQL Server. Verifique credenciales y puerto 1433.' });
        }
        if (err.code === 'ELOGIN') {
             return res.status(500).json({ error: 'Usuario o contraseña de Base de Datos incorrectos.' });
        }
        
        res.status(500).json({ error: 'Error interno: ' + err.message });
    }
});

// =============================================================================
// 5. INICIAR SERVIDOR
// =============================================================================
app.listen(PORT, HOST, () => {
    console.log(`\n==================================================`);
    console.log(`✅ SERVIDOR EN LÍNEA - ENTORNO WEB HABILITADO`);
    console.log(`==================================================`);
    console.log(`📂 Modo: Producción / Web`);
    console.log(`🔌 Puerto: ${PORT}`);
    console.log(`\nPARA ACCEDER DESDE OTROS DISPOSITIVOS:`);
    console.log(`   1. Asegúrese que este PC no tenga Firewall bloqueando el puerto ${PORT}.`);
    console.log(`   2. Si está en la misma red WiFi, use: http://172.16.19.151:${PORT}`);
    console.log(`   3. Si está FUERA de la red, necesitará una IP Pública o VPN.`);
    console.log(`==================================================\n`);
});