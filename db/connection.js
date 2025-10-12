import mysql from 'mysql2/promise';
//  senh nova: $f8HDL!bJ(r4;~Uv
// export const pool = mysql.createPool({
//     host: '177.234.144.114',
//     user: 'projetosufam_ecovia_admin',
//     password: 'P~+IZp*@vil]',
//     database: 'projetosufam_ecovia',
//     waitForConnections: true,
//     connectionLimit: 10,
//     connectTimeout: 10000,
//     queueLimit: 0
// });
export const pool = mysql.createPool({
    host: '177.70.4.10',
    user: 'projetosufam_ecovia_admin',
    password: '$f8HDL!bJ(r4;~Uv',
    database: 'projetosufam_ecovia',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000,
    queueLimit: 0
});
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("Conectado ao banco de dados.");
        connection.release();
    } catch (err) {
        console.error("Erro ao conectar com o banco:", err);
    }
})();
async function adicionarUsuario(username, email, password, avatar) {
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query(
            `INSERT INTO usuarios (user, email, password, avatar) VALUES (?, ?, ?, ?)`, 
            [username, email, password, avatar]
        );
        connection.release();
        return results.insertId;
    } catch (err) {
        throw err;
    }
}
