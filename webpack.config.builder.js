const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const devPath = path.resolve(__dirname, 'dev');
const devPathJoin = path.join(__dirname, 'dev');
const externalPathJoin = path.join(__dirname, 'dev', 'External');
const loose = true;

const babelLoaderOptions = function() {
	return {
		ignore: [/\/core-js/],
		cacheDirectory: true,
		overrides: [
			{
				test: './node_modules/',
				sourceType: 'unambiguous'
			}
		],
		presets: [
			[
				'@babel/preset-env',
				{
					useBuiltIns: 'usage',
					corejs: { version: 3, proposals: true },
					loose: loose,
					modules: false
				}
			]
		],
		plugins: [
			[
				'@babel/plugin-transform-runtime',
				{
					corejs: 3,
					useESModules: true
				}
			],
			[
				'@babel/plugin-proposal-decorators',
				{
					legacy: true
				}
			],
			'@babel/plugin-proposal-class-properties'
		]
	};
};

process.noDeprecation = true;
module.exports = function(publicPath, pro, mode) {
	return {
		mode: mode || 'development',
		devtool: 'inline-source-map',
		entry: {
			'js/polyfills': path.join(devPathJoin, 'polyfills.js'),
			'js/boot': path.join(devPathJoin, 'boot.js'),
			'js/app': path.join(devPathJoin, 'app.js'),
			'js/admin': path.join(devPathJoin, 'admin.js')
		},
		output: {
			pathinfo: true,
			path: path.join(__dirname, 'rainloop', 'v', '0.0.0', 'static'),
			filename: '[name].js',
			publicPath: publicPath || 'rainloop/v/0.0.0/static/'
		},
		performance: {
			hints: false
		},
		optimization: {
			concatenateModules: false,
			minimize: false
		},
		plugins: [
			new webpack.DefinePlugin({
				'RL_COMMUNITY': !pro,
				'process.env.NODE_ENV': JSON.stringify('production'),
				'process.env': {
					NODE_ENV: JSON.stringify('production')
				}
			}),
			new webpack.DefinePlugin({}),
			new CopyWebpackPlugin([
				{ from: 'node_modules/openpgp/dist/openpgp.min.js', to: 'js/min/openpgp.min.js' },
				{ from: 'node_modules/openpgp/dist/openpgp.worker.min.js', to: 'js/min/openpgp.worker.min.js' }
			])
		],
		resolve: {
			modules: [devPath, 'node_modules'],
			extensions: ['.js'],
			alias: {
				'Opentip$': path.join(externalPathJoin, 'Opentip.js'),
				'ko$': path.join(externalPathJoin, 'ko.js')
			}
		},
		module: {
			rules: [
				{
					test: /\.js$/,
					loader: 'babel-loader',
					include: [devPath],
					options: babelLoaderOptions()
				},
				{
					test: /\.html$/,
					loader: 'raw-loader',
					include: [devPath]
				},
				{
					test: /\.css/,
					loaders: ['style-loader', 'css-loader'],
					include: [devPath]
				},
				{
					test: /\.json$/,
					loader: 'json-loader',
					include: [devPath]
				}
			]
		},
		externals: {
			'window': 'window',
			'progressJs': 'window.progressJs',
			'moment': 'window.moment',
			'ifvisible': 'window.ifvisible',
			'crossroads': 'window.crossroads',
			'hasher': 'window.hasher',
			'Jua': 'window.Jua',
			'Autolinker': 'window.Autolinker',
			'ssm': 'window.ssm',
			'key': 'window.key',
			'_': 'window._',
			'qr': 'window.qr',
			'$': 'window.jQuery'
		}
	};
};
