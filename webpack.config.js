const path = require('path');
const webpack = require("webpack");
const merge = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const StylesLoader = require('styles-loader');
const stylesLoader = (production) => {
  return new StylesLoader({
    extract: 'bundled.css',
    image: {
      disable: !production
    }
  });
}

const common = {
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.mp3$/i,
        exclude: /(node_modules)/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath:'./assets/audio'
        },
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      $utils: path.resolve('./src/modules/utils/index.js'),
      $commons: path.resolve('./src/modules/commons/index.js'),
      $icons: path.resolve('./src/modules/icons/index.js'),
      $data: path.resolve('./src/modules/data/index.js')
    })
  ],
};

const prod = {
  mode: 'production',
  watch: false,
  stats: false,
  optimization: {
    minimizer: [new TerserPlugin()]
  }
};

const dev = {
  mode: 'development',
  watch: true,
  stats: {
    version: false,
    colors: true,
    warnings: false,
    assets: true,
    cached: false,
    cachedAssets: false,
    children: false,
    chunks: false,
    chunkModules: false,
    chunkOrigins: false,
    depth: false,
    entrypoints: false,
    errors: true,
    errorDetails: true,
    hash: false,
    modules: false,
    providedExports: false,
    publicPath: false,
    timings: true,
    usedExports: false
  }
};

const start = {
  target: 'web',
  entry: {
    index: './src/index.js'
  },
  output: {
    filename: 'bundled.js',
    path: path.resolve(__dirname, './docs/src'),
    publicPath: 'src/',
    globalObject: 'window'
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'docs'),
    watchContentBase: true,
    publicPath: '/src/',
    compress: true,
    port: 8080,
    open: true
  },
};

module.exports = (env) => {
  return merge(common, env.prod ? prod : dev, stylesLoader(env.prod), start);
};