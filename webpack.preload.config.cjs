const path = require('path');

module.exports = {
  mode: 'production',
  entry: './public/preload/services.js',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'services.js',
    library: {
      type: 'commonjs2'
    }
  },
  externals: {
    // uTools 提供的模块不需要打包
    'utools': 'utools'
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  optimization: {
    minimize: false // 避免压缩导致的问题
  }
};