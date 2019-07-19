const path = require('path');
const webpack = require("webpack");
const merge = require('webpack-merge');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const StylesLoader = require('styles-loader');
const stylesLoader = (production) => {
  return new StylesLoader({
    extract: 'bundled.css',
    image:{
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
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      $utils: path.resolve('./public/prod/modules/utils/index'),
      $commons: path.resolve('./public/prod/modules/commons/index'),
      $icons: path.resolve('./public/prod/modules/icons/index'),
      $data: path.resolve('./public/prod/modules/data/index')
    })
  ],
};

const prod = {
  mode: 'production',
  watch: false,
  stats: false,
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        uglifyOptions: {
          compress: true,
          mangle: false,
          output: {
            indent_level: 2,
            comments: false,
            beautify: false
          }
        }
      })
    ]
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
    index: './public/prod/index.js'
  },
  output: {
    filename: 'bundled.js',
    path: path.resolve(__dirname, 'public/dist'),
    library: 'bundled',
    libraryTarget: 'var',
    libraryExport: 'default',
    globalObject: 'this'
  },
  devServer: {
    contentBase: path.resolve(__dirname, 'public'),
    watchContentBase: true,
    publicPath:'/',
    compress: true,
    port: 8080,
    open: true
  },
};

module.exports = (env)=>{
  return merge(common, env.prod ? prod:dev, stylesLoader(env.prod), start);
};