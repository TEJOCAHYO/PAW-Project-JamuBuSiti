const model = require('../models/produkModel');

// Bungkus handler supaya error dari model menjadi respons JSON yang rapi
const wrap = (fn, ok = 200) => (req, res) => {
  try { res.status(ok).json(fn(req)); }
  catch (e) { res.status(e.status || 500).json({ pesan: e.message }); }
};

exports.sellers = wrap(req => model.listSellers({ keluhan: req.query.keluhan }));
exports.seller = wrap(req => model.getSeller(req.params.id));
exports.menu = wrap(() => model.listMenu());
exports.createOrder = wrap(req => model.createOrder(req.body || {}), 201);
exports.orders = wrap(req => model.listOrders({ sellerId: req.query.sellerId }));
exports.setStatus = wrap(req => model.setStatus(req.params.id, (req.body || {}).status));
exports.toggleStok = wrap(req => model.toggleStok(req.params.id));
exports.addReview = wrap(req => model.addReview(req.params.id, req.body || {}), 201);

// --- API Produk ---
exports.listProduk = wrap(req => model.listProduk(req.query));
exports.getProduk = wrap(req => model.getProduk(req.params.id));
exports.createProduk = wrap(req => model.createProduk(req.body || {}), 201);
exports.updateProduk = wrap(req => model.updateProduk(req.params.id, req.body || {}));
exports.deleteProduk = wrap(req => model.deleteProduk(req.params.id));