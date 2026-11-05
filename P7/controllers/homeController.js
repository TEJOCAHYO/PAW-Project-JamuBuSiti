const config = require('../config');

exports.index = (req, res) => {
  res.render('index', {
    title: 'Jamuku - Jamu segar diantar ke rumah',
    keluhan: config.keluhan,
    jamAntar: config.jamAntar,
    sellerLogin: config.sellerLogin
  });
};
