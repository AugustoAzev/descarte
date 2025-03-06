import express from 'express';
import path from 'path';
import session from 'express-session';
import { pool, adicionarUsuario } from './db/connection.js';
import { fileURLToPath } from 'url';
import { enviarEmailBoasVindas } from './email/boasvindas.js';
import { enviarEmailRecuperacao } from './email/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
const PORT = process.env.PORT || 9990;
// const PORT = 9876;
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'sessao_user_ecovia',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

// app.use(express.static(path.join(__dirname, 'views')));
app.use('/img', express.static('public/img'));

app.get('/', (req, res) => {
    const isLoggedIn = req.session.userId ? true : false;
    
    res.render('index', {
        isLoggedIn, 
        userName: req.session.userName, 
        userId: req.session.userId
    });
});
app.get('/mapa', (req, res) => {
    const isLoggedIn = req.session.userId ? true : false;
    res.render('mapa', {
        isLoggedIn, 
        userName: req.session.userName, 
        userId: req.session.userId,
        avatar: req.session.avatar
    });
});
app.get('/solicitacoes', (req, res) => {
    const isLoggedIn = req.session.userId ? true : false;
    if(isLoggedIn){
        res.render('solicitacoes', {
            isLoggedIn, 
            userName: req.session.userName, 
            userId: req.session.userId
        });
    }
    else{
        res.redirect('/');
    } 
});
app.get('/termos', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'termos.html'));
});
app.get('/recuperacao', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'recuperacao.html'));
});
app.post('/recuperar', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'E-mail é obrigatório' });
        }
        const connection = await pool.getConnection();
        try {
            const queryUser = 'SELECT id FROM usuarios WHERE email = ?';
            const [results] = await connection.execute(queryUser, [email]);
            if (results.length === 0) {
                connection.release();
                return res.status(404).json({ success: false, message: 'E-mail não encontrado!' });
            }
            const userId = results[0].id;
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 3600000);
            const saveTokenQuery = 'INSERT INTO tokens (user_id, token, expires) VALUES (?, ?, ?)';
            await connection.execute(saveTokenQuery, [userId, token, expires]);
            connection.release();
            const resetLink = `http://projetosufam.com.br/ecovia/redefinir-senha?token=${token}`;
            try {
                await enviarEmailRecuperacao(email, resetLink);
                console.log(`E-mail de recuperação enviado para: ${email}`);
                return res.json({ success: true, message: 'E-mail de recuperação enviado com sucesso!' });
            } catch (error) {
                console.error('Erro ao enviar e-mail:', error);
                return res.status(500).json({ success: false, message: 'Erro ao enviar o e-mail' });
            }
        } catch (err) {
            console.error('Erro ao verificar usuário:', err);
            return res.status(500).json({ success: false, message: 'Erro no servidor' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro inesperado:', error);
        return res.status(500).json({ success: false, message: 'Erro inesperado no servidor' });
    }
});
app.get('/redefinir-senha', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Token inválido.');
    }
    const connection = await pool.getConnection();
    try {
        const queryToken = 'SELECT user_id FROM tokens WHERE token = ?';
        const [results] = await connection.execute(queryToken, [token]);
        if (results.length === 0) {
            connection.release();
            return res.status(400).send('Token inválido ou expirado.');
        }
        connection.release();
        res.render('redefinir-senha', { token });
    } catch (err) {
        connection.release();
        console.error('Erro ao validar token:', err);
        return res.status(500).send('Erro ao validar o token.');
    }
});
app.post('/atualizar-senha', async (req, res) => {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) {
        return res.status(400).json({ success: false, message: 'Token inválido ou senha não informada.' });
    }
    const connection = await pool.getConnection();
    try {
        const queryToken = 'SELECT user_id FROM tokens WHERE token = ?';
        const [tokenResults] = await connection.execute(queryToken, [token]);
        if (tokenResults.length === 0) {
            connection.release();
            return res.status(400).json({ success: false, message: 'Token inválido ou expirado.' });
        }
        const userId = tokenResults[0].user_id;
        const saltRounds = 10;
        const senhaCriptografada = await bcrypt.hash(novaSenha, saltRounds);
        const updateQuery = 'UPDATE usuarios SET password = ? WHERE id = ?';
        await connection.execute(updateQuery, [senhaCriptografada, userId]);
        const deleteTokenQuery = 'DELETE FROM tokens WHERE token = ?';
        await connection.execute(deleteTokenQuery, [token]);
        connection.release();
        return res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    } catch (err) {
        connection.release();
        console.error('Erro ao atualizar senha:', err);
        return res.status(500).json({ success: false, message: 'Erro no servidor ao redefinir a senha.' });
    }
});
app.post('/cadastrar', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Preencha todos os campos obrigatórios.' });
        }
        const avatar = '/img/perfil/avatar10.png';
        const connection = await pool.getConnection();
        try {
            const checkQuery = 'SELECT id FROM usuarios WHERE user = ? OR email = ?';
            const [existingUser] = await connection.execute(checkQuery, [username, email]);
            if (existingUser.length > 0) {
                connection.release();
                return res.status(409).json({ success: false, message: 'Nome de usuário ou e-mail já está em uso.' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertQuery = `
                INSERT INTO usuarios (user, email, password, avatar)
                VALUES (?, ?, ?, ?)
            `;
            const [result] = await connection.execute(insertQuery, [username, email, hashedPassword, avatar]);
            connection.release();
            try {
                await enviarEmailBoasVindas(email, username);
            } catch (emailError) {
                console.warn(`Erro ao enviar e-mail de boas-vindas: ${emailError.message}`);
            }
            req.session.userId = result.insertId;
            req.session.userName = username;
            req.session.avatar = avatar;
            return res.redirect('/perfil');
        } catch (dbError) {
            connection.release();
            console.error('Erro no banco de dados:', dbError);
            return res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário no banco de dados.' });
        }
    } catch (serverError) {
        console.error('Erro interno no servidor:', serverError);
        return res.status(500).json({ success: false, message: 'Erro ao processar o cadastro.' });
    }
});
app.post('/entrar', async (req, res) => {
    const { username, password } = req.body;
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query('SELECT * FROM usuarios WHERE user = ?', [username]);
        connection.release();
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Nome de usuário não encontrado.' });
        }
        const userRecord = results[0];
        const senhaCorreta = await bcrypt.compare(password, userRecord.password);
        if (!senhaCorreta) {
            return res.status(401).json({ success: false, message: 'Sua senha está incorreta.' });
        }
        req.session.userId = userRecord.id;
        req.session.userName = userRecord.user;
        req.session.avatar = userRecord.avatar || '/img/perfil/avatar10.png';

        return res.status(200).json({ success: true, redirectUrl: '/' });

    } catch (err) {
        console.error("Erro ao tentar entrar:", err);
        return res.status(500).json({ success: false, message: 'Erro ao processar login.' });
    }
});
app.get('/perfil', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    try {
        const connection = await pool.getConnection();
        if (!req.session.avatar) {
            const query = 'SELECT avatar FROM usuarios WHERE id = ?';
            const [results] = await connection.execute(query, [req.session.userId]);
            connection.release();
            req.session.avatar = results[0]?.avatar || '/img/perfil/avatar1.png';
        }
        res.render('perfil', { 
            userName: req.session.userName, 
            userId: req.session.userId, 
            avatar: req.session.avatar 
        });
    } catch (error) {
        console.error("Erro ao carregar avatar:", error);
        res.status(500).json({ message: "Erro ao carregar avatar." }); 
    }
});
app.get('/votacao', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    try {
        const connection = await pool.getConnection();
        if (!req.session.userName) {
            const query = 'SELECT user FROM usuarios WHERE id = ?';
            const [results] = await connection.execute(query, [req.session.userId]);
            connection.release();
            if (results.length === 0) {
                return res.status(404).json({ message: "Usuário não encontrado." });
            }
            req.session.userName = results[0].user;
        }
        res.render('votacao', { 
            userName: req.session.userName, 
            userId: req.session.userId,
            avatar: req.session.avatar 
        });
    } catch (error) {
        console.error("Erro ao encontrar usuário:", error);
        res.status(500).json({ message: "Erro ao encontrar usuário." });
    }
});
app.post('/update-avatar', async (req, res) => {
    const { userId, avatarPath } = req.body;
    if (!userId || !avatarPath) {
        return res.status(400).json({ message: "Parâmetros inválidos." });
    }
    try {
        const connection = await pool.getConnection();
        const query = 'UPDATE usuarios SET avatar = ? WHERE id = ?';
        const [results] = await connection.execute(query, [avatarPath, userId]);
        connection.release();
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        req.session.avatar = avatarPath;
        res.status(200).json({ message: "Avatar atualizado com sucesso!" });
    } catch (error) {
        console.error("Erro ao atualizar avatar:", error);
        res.status(500).json({ message: "Erro ao atualizar o avatar." });
    }
});
app.get('/sair', async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) return reject(err);
                resolve();
            });
        });
        res.redirect('/');
    } catch (error) {
        console.error('Erro ao encerrar sessão:', error);
        res.status(500).send('Erro ao encerrar sessão!');
    }
});
app.post('/deletarConta', async (req, res) => {
    const userId = req.session.userId;
    const { password } = req.body;
    if (!userId) {
        return res.redirect('/');
    }
    try {
        const connection = await pool.getConnection();
        const query = 'SELECT * FROM usuarios WHERE id = ?';
        const [results] = await connection.query(query, [userId]);
        if (results.length === 0) {
            connection.release();
            return res.status(404).send('Usuário não encontrado');
        }
        const userRecord = results[0];
        const senhaCorreta = await bcrypt.compare(password, userRecord.password);
        if (!senhaCorreta) {
            connection.release();
            return res.status(401).send('Senha incorreta!');
        }
        const deleteQuery = 'DELETE FROM usuarios WHERE id = ?';
        await connection.query(deleteQuery, [userId]);
        connection.release();
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send('Erro ao encerrar sessão!');
            }
            res.redirect('/');
        });
    } catch (err) {
        console.error('Erro ao deletar conta:', err);
        return res.status(500).send('Erro ao processar a exclusão da conta.');
    }
});
app.post('/adicionar-ponto', async (req, res) => {
    const { titulo, residuo, local, latitude, longitude, user_id } = req.body;
    if (!titulo || !residuo || !local || !latitude || !longitude || !user_id) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    try {
        const connection = await pool.getConnection();
        const sql = `
            INSERT INTO solicitacoes (titulo, residuo, local, latitude, longitude, votos_positivos, votos_negativos, status, user_id)
            VALUES (?, ?, ?, ?, ?, 0, 0, 'pendente', ?)
        `;
        await connection.query(sql, [titulo, residuo, local, latitude, longitude, user_id]);
        connection.release();
        return res.status(200).json({ message: 'Solicitação adicionada com sucesso!' });
    } catch (err) {
        console.error('Erro ao salvar solicitação:', err);
        return res.status(500).json({ message: 'Erro ao salvar solicitação.' });
    }
});
app.get('/pontos-pendentes', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const sql = `SELECT id, titulo, residuo, local, latitude, longitude, votos_positivos, votos_negativos, user_id FROM solicitacoes`;
        const [results] = await connection.query(sql);
        const buscaSolicitante = await Promise.all(
            results.map(async (row) => {
                try {
                    const solicitanteSQL = `SELECT user FROM usuarios WHERE id = ?`;
                    const [solicitanteResults] = await connection.query(solicitanteSQL, [row.user_id]);
                    const solicitante = solicitanteResults.length > 0 ? solicitanteResults[0].user : "Desconhecido";
                    return {
                        id: row.id,
                        titulo: row.titulo,
                        residuo: row.residuo,
                        local: row.local,
                        latitude: row.latitude,
                        longitude: row.longitude,
                        votos_positivos: row.votos_positivos,
                        votos_negativos: row.votos_negativos,
                        solicitante: solicitante
                    };
                } catch (error) {
                    console.error("Erro ao buscar solicitante:", error);
                    return { ...row, solicitante: "Erro ao buscar" };
                }
            })
        );
        connection.release();
        return res.status(200).json(buscaSolicitante);
    } catch (err) {
        console.error("Erro ao buscar solicitações pendentes:", err);
        return res.status(500).json({ message: "Erro ao buscar solicitações." });
    }
});
app.post('/votos', async (req, res) => {
    const { user_id, pointId, vote } = req.body;
    if (!user_id || !pointId || !vote) {
        return res.status(400).json({ message: 'Parâmetros inválidos.' });
    }
    try {
        const connection = await pool.getConnection();
        const checkVoteQuery = `SELECT * FROM votos WHERE user_id = ? AND point_id = ?`;
        const [voteResults] = await connection.query(checkVoteQuery, [user_id, pointId]);
        if (voteResults.length > 0) {
            connection.release();
            return res.status(403).json({ message: 'Você já votou neste ponto.' });
        }
        const insertVoteQuery = `INSERT INTO votos (user_id, point_id, vote) VALUES (?, ?, ?)`;
        await connection.query(insertVoteQuery, [user_id, pointId, vote]);
        const updateVoteQuery = `
            UPDATE solicitacoes
            SET ${vote === 'positivo' ? 'votos_positivos = votos_positivos + 1' : 'votos_negativos = votos_negativos + 1'}
            WHERE id = ?
        `;
        await connection.query(updateVoteQuery, [pointId]);
        const checkVotesQuery = `SELECT votos_positivos, votos_negativos, status FROM solicitacoes WHERE id = ?`;
        const [voteCounts] = await connection.query(checkVotesQuery, [pointId]);
        const { votos_positivos, votos_negativos, status } = voteCounts[0];
        if (votos_positivos >= 10) {
            if (status === 'remocao') {
                const deleteQuery = `DELETE FROM dados WHERE id = ?`;
                await connection.query(deleteQuery, [pointId]);
            } else {
                const moveToDadosQuery = `
                    INSERT INTO dados (titulo, residuo, local, latitude, longitude, user_id)
                    SELECT titulo, residuo, local, latitude, longitude, user_id FROM solicitacoes WHERE id = ?
                `;
                await connection.query(moveToDadosQuery, [pointId]);
            }
            const deleteSolicitacao = `DELETE FROM solicitacoes WHERE id = ?`;
            await connection.query(deleteSolicitacao, [pointId]);
        }
        else if (votos_negativos >= 10) {
            const deleteSolicitacao = `DELETE FROM solicitacoes WHERE id = ?`;
            await connection.query(deleteSolicitacao, [pointId]);
        }
        connection.release();
        return res.status(200).json({ message: 'Voto registrado com sucesso.' });
    } catch (err) {
        console.error("Erro ao processar voto:", err);
        return res.status(500).json({ message: "Erro ao processar voto." });
    }
});
app.get('/geojson-data', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query(`
            SELECT d.id, d.titulo, d.residuo, d.local, d.latitude, d.longitude, 
                   u.user AS solicitante
            FROM dados d
            LEFT JOIN usuarios u ON d.user_id = u.id
        `);
        connection.release();
        const geojson = {
            type: "FeatureCollection",
            features: results.map(row => ({
                type: "Feature",
                properties: {
                    id: row.id,
                    titulo: row.titulo,
                    residuo: row.residuo,
                    local: row.local,
                    solicitante: row.solicitante || "Desconhecido"
                },
                geometry: {
                    type: "Point",
                    coordinates: [
                        parseFloat(row.longitude) || 0,
                        parseFloat(row.latitude) || 0
                    ]
                }
            }))
        };
        res.status(200).json(geojson);
    } catch (err) {
        console.error("Erro ao buscar dados:", err);
        res.status(500).json({ message: "Erro ao buscar dados." });
    }
});
app.post('/solicitar-remocao', async (req, res) => {
    const { userId, pointId } = req.body;
    if (!userId || !pointId) {
        return res.status(400).json({ success: false, message: "Parâmetros inválidos." });
    }
    try {
        const connection = await pool.getConnection();
        const [existingRequests] = await connection.query(
            `SELECT * FROM remocoes_pendentes WHERE point_id = ? AND user_id = ?`,
            [pointId, userId]
        );
        if (existingRequests.length > 0) {
            connection.release();
            return res.status(403).json({ success: false, message: "Você já solicitou a remoção deste ponto." });
        }
        await connection.query(
            `INSERT INTO remocoes_pendentes (point_id, user_id) VALUES (?, ?)`,
            [pointId, userId]
        );
        connection.release();

        return res.status(200).json({ success: true, message: "Solicitação de remoção enviada!" });

    } catch (err) {
        console.error("Erro ao processar solicitação de remoção:", err);
        return res.status(500).json({ success: false, message: "Erro ao registrar solicitação." });
    }
});
app.get('/solicitacao-usuario/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query(
            `SELECT id, titulo, residuo, local, votos_positivos, votos_negativos, status 
             FROM solicitacoes WHERE user_id = ?`,
            [userId]
        );
        connection.release();
        return res.status(200).json(results);
    } catch (err) {
        console.error('Erro ao buscar solicitações do usuário:', err);
        return res.status(500).json({ message: 'Erro ao buscar solicitações.' });
    }
});
app.delete('/deletar-solicitacao/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(
            `DELETE FROM solicitacoes WHERE id = ?`,
            [id]
        );
        connection.release();
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitação não encontrada.' });
        }
        return res.status(200).json({ message: 'Solicitação excluída com sucesso!' });
    } catch (err) {
        console.error('Erro ao excluir solicitação:', err);
        return res.status(500).json({ message: 'Erro ao excluir solicitação.' });
    }
});
app.listen(PORT, '0.0.0.0', () => {
    console.log('Servidor rodando na porta: ', PORT);
});