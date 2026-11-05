const router = require('express').Router();
const c = require('../controllers/apiController');

router.get('/sellers', c.sellers);
router.get('/sellers/:id', c.seller);
router.get('/menu', c.menu);
router.post('/orders', c.createOrder);
router.get('/orders', c.orders);
router.patch('/orders/:id/status', c.setStatus);
router.post('/orders/:id/review', c.addReview);
router.patch('/menu/:id/stok', c.toggleStok);

// API Produk (jamu)
router.get('/produk', c.listProduk);
router.get('/produk/:id', c.getProduk);
router.post('/produk', c.createProduk);
router.put('/produk/:id', c.updateProduk);
router.delete('/produk/:id', c.deleteProduk);

module.exports = router;
