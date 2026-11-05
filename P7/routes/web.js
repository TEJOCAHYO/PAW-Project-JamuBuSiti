const router = require('express').Router();
const home = require('../controllers/homeController');

router.get('/', home.index);

module.exports = router;
