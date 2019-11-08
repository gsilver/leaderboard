const webpack = require('webpack');
const path = require('path');

const _dev = path.resolve(__dirname, 'lib');

module.exports = {
  entry: {
    web: _dev + '/web.js'
  },
  output: {
    path: path.resolve(__dirname, 'web'),
    filename: '[name].js'
  },
  module: {
    loaders: [{
      include: _dev,
      loader: 'babel-loader'
    }]
  }
};
