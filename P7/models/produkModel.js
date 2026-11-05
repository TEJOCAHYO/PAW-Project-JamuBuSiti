const config = require('../config');

// Data penjual & menu (pengganti database)
const SELLERS = [
  {id:"s1",nama:"Jamu Sehat Bu Siti",jarak:1.2,rating:4.7,racik:"Diracik pagi hari",verif:true,
   menu:[
    {id:"m1",nama:"Beras kencur",harga:8000,keluhan:["Pegal linu","Masuk angin"]},
    {id:"m2",nama:"Kunyit asam",harga:8000,keluhan:["Datang bulan"]},
    {id:"m3",nama:"Cabe puyang",harga:9000,keluhan:["Pegal linu"]},
    {id:"m4",nama:"Temulawak",harga:10000,keluhan:["Nafsu makan"]}]}
];

// Stok awal tiap jamu (porsi per hari)
SELLERS.forEach(s => s.menu.forEach(m => { m.stok = m.stok ?? 20; }));

// State di memori (hilang saat server restart)
const state = { orders: [], reviews: [] };

const fail = (status, pesan) => { const e = new Error(pesan); e.status = status; throw e; };
const allMenu = () => SELLERS.flatMap(s => s.menu.map(m => ({ ...m, sellerId: s.id, stok: m.stok, habis: m.stok <= 0 })));
const findMenu = id => allMenu().find(m => m.id === id);
const sellerOf = id => SELLERS.find(s => s.id === id);

function ratingOf(s) {
  const r = state.reviews.filter(x => x.sellerId === s.id);
  const avg = (s.rating * 10 + r.reduce((a, x) => a + x.rating, 0)) / (10 + r.length);
  return { rating: +avg.toFixed(1), jumlahUlasan: r.length, ulasanTerbaru: r.length ? r[r.length - 1].teks : null };
}
const withStock = s => ({ ...s, ...ratingOf(s), menu: s.menu.map(m => ({ ...m, stok: m.stok, habis: m.stok <= 0 })) });
const decorate = o => ({ ...o, sellerNama: sellerOf(o.sellerId).nama, ulasan: state.reviews.find(r => r.orderId === o.id) || null });

// F-01 + F-02: filter keluhan, radius <= 5 km, urut jarak terdekat
exports.listSellers = ({ keluhan } = {}) =>
  SELLERS.filter(s => s.jarak <= config.radiusKm)
    .sort((a, b) => a.jarak - b.jarak)
    .map(withStock)
    .map(s => ({ ...s, menu: s.menu.filter(m => !keluhan || keluhan === 'Semua' || m.keluhan.includes(keluhan)) }))
    .filter(s => s.menu.length);

exports.getSeller = id => { const s = sellerOf(id); if (!s) fail(404, 'Penjual tidak ditemukan'); return withStock(s); };
exports.listMenu = () => allMenu();

// F-03 + F-06: checkout, jumlah banyak, jadwal antar
exports.createOrder = ({ items, jam, metode }) => {
  if (!Array.isArray(items) || !items.length) fail(400, 'Keranjang kosong');
  if (!config.jamAntar.includes(jam)) fail(400, 'Jam antar tidak valid');
  if (!config.metodeBayar.includes(metode)) fail(400, 'Metode pembayaran tidak valid');
  const rows = items.map(i => {
    const m = findMenu(i.id), q = parseInt(i.qty, 10);
    if (!m) fail(400, 'Menu tidak ditemukan');
    if (!(q > 0 && q <= 50)) fail(400, 'Jumlah tidak valid');
    if (m.habis) fail(409, m.nama + ' sedang habis');
    if (q > m.stok) fail(409, `Stok ${m.nama} tinggal ${m.stok} porsi`);
    return { id: m.id, nama: m.nama, harga: m.harga, qty: q, sellerId: m.sellerId };
  });
  if (new Set(rows.map(r => r.sellerId)).size > 1) fail(400, 'Satu pesanan hanya untuk satu penjual');
  if (new Set(rows.map(r => r.id)).size !== rows.length) fail(400, 'Item duplikat dalam pesanan');
  rows.forEach(r => { findRaw(r.id).m.stok -= r.qty; }); // stok berkurang saat pesanan dibuat
  const order = {
    id: 'o' + Date.now() + Math.floor(Math.random() * 100),
    sellerId: rows[0].sellerId,
    items: rows.map(({ sellerId, ...r }) => r),
    total: rows.reduce((a, r) => a + r.harga * r.qty, 0),
    jam, metode, status: 'Dibayar', waktu: new Date().toISOString()
  };
  state.orders.unshift(order);
  return decorate(order);
};

exports.listOrders = ({ sellerId } = {}) => state.orders.filter(o => !sellerId || o.sellerId === sellerId).map(decorate);

// F-04: terima / tolak / selesai
const NEXT = { Dibayar: ['Diproses', 'Ditolak'], Diproses: ['Selesai'] };
exports.setStatus = (id, status) => {
  const o = state.orders.find(x => x.id === id);
  if (!o) fail(404, 'Pesanan tidak ditemukan');
  if (!(NEXT[o.status] || []).includes(status)) fail(409, `Status ${o.status} tidak bisa diubah ke ${status}`);
  o.status = status;
  if (status === 'Ditolak') o.items.forEach(i => { const f = findRaw(i.id); if (f) f.m.stok += i.qty; }); // stok dikembalikan
  return decorate(o);
};

// F-05: stok habis / tersedia
exports.toggleStok = id => {
  const f = findRaw(id); if (!f) fail(404, 'Menu tidak ditemukan');
  f.m.stok = f.m.stok > 0 ? 0 : 10;
  return toProduk(f.s, f.m);
};

// F-07: rating & ulasan
exports.addReview = (orderId, { rating, teks }) => {
  const o = state.orders.find(x => x.id === orderId);
  if (!o) fail(404, 'Pesanan tidak ditemukan');
  if (o.status !== 'Selesai') fail(409, 'Ulasan hanya untuk pesanan selesai');
  if (state.reviews.some(r => r.orderId === orderId)) fail(409, 'Pesanan sudah diulas');
  const n = parseInt(rating, 10);
  if (!(n >= 1 && n <= 5) || !String(teks || '').trim()) fail(400, 'Rating 1-5 dan ulasan wajib diisi');
  const rv = { orderId, sellerId: o.sellerId, rating: n, teks: String(teks).trim().slice(0, 300) };
  state.reviews.push(rv);
  return rv;
};

// ===== API Produk: CRUD jamu oleh penjual (F-05) =====
const KELUHAN_VALID = config.keluhan.filter(k => k !== 'Semua');

function cekProduk({ nama, harga, keluhan, stok }, parsial = false) {
  const out = {};
  if (!parsial || nama !== undefined) {
    const n = String(nama || '').trim();
    if (!n || n.length > 60) fail(400, 'Nama jamu wajib diisi (maks. 60 karakter)');
    out.nama = n;
  }
  if (!parsial || harga !== undefined) {
    const h = Number(harga);
    if (!Number.isInteger(h) || h < 1000 || h > 500000) fail(400, 'Harga harus bilangan bulat Rp1.000 - Rp500.000');
    out.harga = h;
  }
  if (!parsial || keluhan !== undefined) {
    if (!Array.isArray(keluhan) || !keluhan.length || !keluhan.every(k => KELUHAN_VALID.includes(k)))
      fail(400, 'Keluhan harus berisi salah satu dari: ' + KELUHAN_VALID.join(', '));
    out.keluhan = keluhan;
  }
  if (stok !== undefined) {
    const t = Number(stok);
    if (!Number.isInteger(t) || t < 0 || t > 9999) fail(400, 'Stok harus bilangan bulat 0 - 9999');
    out.stok = t;
  } else if (!parsial) out.stok = 10;
  return out;
}
const findRaw = id => { for (const s of SELLERS) { const m = s.menu.find(x => x.id === id); if (m) return { s, m }; } return null; };
const toProduk = (s, m) => ({ ...m, sellerId: s.id, sellerNama: s.nama, jarak: s.jarak, stok: m.stok, habis: m.stok <= 0 });

// GET /api/produk?keluhan=&q=&sellerId=  (tanpa sellerId: hanya penjual dalam radius 5 km)
exports.listProduk = ({ keluhan, sellerId, q } = {}) =>
  SELLERS.filter(s => (sellerId ? s.id === sellerId : s.jarak <= config.radiusKm))
    .flatMap(s => s.menu.map(m => toProduk(s, m)))
    .filter(p => !keluhan || keluhan === 'Semua' || p.keluhan.includes(keluhan))
    .filter(p => !q || p.nama.toLowerCase().includes(String(q).toLowerCase()));

exports.getProduk = id => { const f = findRaw(id); if (!f) fail(404, 'Produk tidak ditemukan'); return toProduk(f.s, f.m); };

exports.createProduk = ({ sellerId, ...data }) => {
  const s = sellerOf(sellerId || config.sellerLogin);
  if (!s) fail(404, 'Penjual tidak ditemukan');
  const m = { id: 'm' + Date.now() + Math.floor(Math.random() * 100), ...cekProduk(data) };
  s.menu.push(m);
  return toProduk(s, m);
};

exports.updateProduk = (id, data) => {
  const f = findRaw(id); if (!f) fail(404, 'Produk tidak ditemukan');
  Object.assign(f.m, cekProduk(data, true));
  if (data.habis !== undefined && data.stok === undefined) f.m.stok = data.habis ? 0 : (f.m.stok > 0 ? f.m.stok : 10);
  return toProduk(f.s, f.m);
};

exports.deleteProduk = id => {
  const f = findRaw(id); if (!f) fail(404, 'Produk tidak ditemukan');
  f.s.menu = f.s.menu.filter(x => x.id !== id);
  return { pesan: 'Produk dihapus', id };
};