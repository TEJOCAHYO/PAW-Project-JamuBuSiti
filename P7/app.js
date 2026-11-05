const express = require('express');
const path = require('path');
const config = require('./config');
const logger = require('./middlewares/logger');
const routes = require('./routes');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(logger);
app.use('/', routes);
app.use((req, res) => res.status(404).json({ pesan: 'Halaman tidak ditemukan' }));

app.listen(config.port, () => console.log(`Jamuku berjalan di http://localhost:${config.port}`));
