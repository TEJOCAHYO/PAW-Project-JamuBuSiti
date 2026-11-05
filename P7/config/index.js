module.exports = {
  port: process.env.PORT || 3000,
  radiusKm: 5,
  sellerLogin: 's1', // Bu Siti dipakai di dashboard penjual
  keluhan: ['Semua', 'Pegal linu', 'Datang bulan', 'Batuk/flu', 'Masuk angin', 'Nafsu makan'],
  jamAntar: ['Secepatnya (maks. 45 menit)', '16.00', '17.00', '18.00', '19.00'],
  metodeBayar: ['QRIS', 'Transfer bank']
};
