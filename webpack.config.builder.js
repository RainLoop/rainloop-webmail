
const
	path = require('path'),
	webpack = require('webpack'),

	CopyWebpackPlugin = require('copy-webpack-plugin'),
	WebpackNotifierPlugin = require('webpack-notifier'),

	devPath = path.resolve(__dirname, 'dev'),
	devPathJoin = path.join(__dirname, 'dev'),
	externalPathJoin = path.join(__dirname, 'dev', 'External'),
	loose = true;

const babelLoaderOptions = function() {
	return {
		cacheDirectory: true,
		presets: [
			['@babel/preset-env', {
				loose: loose,
				modules: false,
				targets: {
					browsers: ['last 3 versions', 'ie >= 9', 'firefox esr']
				}
			}]
		],
		plugins: [
			['@babel/plugin-transform-runtime', {
				corejs: 2
			}],
			['@babel/plugin-proposal-decorators', {
				legacy: true
			}],
			'@babel/plugin-proposal-class-properties'
		]
	};
};

process.noDeprecation = true;
module.exports = function(publicPath, pro, mode) {
	return {
		mode: mode || 'development',
		entry: {
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
				'process.env': {
					NODE_ENV: '"production"'
				}
			}),
			new WebpackNotifierPlugin(),
			new CopyWebpackPlugin([
				{from: 'node_modules/openpgp/dist/openpgp.min.js', to: 'js/min/openpgp.min.js'},
				{from: 'node_modules/openpgp/dist/openpgp.worker.min.js', to: 'js/min/openpgp.worker.min.js'}
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
			'Jua': 'window.Jua',
			'Autolinker': 'window.Autolinker',
			'key': 'window.key',
			'_': 'window._',
			'$': 'window.jQuery'
		}
	};
};
