import fs from 'fs';
import { connection} from './db/connection.js';

const geojson = JSON.parse(fs.readFileSync('./public/data/data_set.geojson', 'utf8'));

const features = geojson.features;

features.forEach(feature => {
    const id = feature.id;
    const ponto = feature.properties.Ponto;
    const residuo = feature.properties.Residuo;
    const local = feature.properties.Local;
    const [longitude, latitude] = feature.geometry.coordinates;

    const sql = `
        INSERT INTO dados (id, titulo, residuo, local, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            titulo = VALUES(titulo),
            residuo = VALUES(residuo),
            local = VALUES(local),
            latitude = VALUES(latitude),
            longitude = VALUES(longitude)
    `;
    const values = [id, ponto, residuo, local, latitude, longitude];

    connection.query(sql, values, (err) => {
        if (err) {
            console.error(`Erro ao inserir o ponto ID ${id}:`, err);
        } else {
            console.log(`Ponto ID ${id} inserido com sucesso.`);
        }
    });
});
connection.end(() => {
    console.log('Conexão com o banco de dados encerrada.');
});