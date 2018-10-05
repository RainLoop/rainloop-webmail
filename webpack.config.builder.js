
const
	path = require('path'),
	webpack = require('webpack'),
	devPath = path.resolve(__dirname, 'dev'),
	CopyWebpackPlugin = require('copy-webpack-plugin'),
	WebpackNotifierPlugin = require('webpack-notifier'),
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
module.exports = function(publicPath, pro) {
	return {
		mode: 'production',
		entry: {
			'js/boot': path.join(__dirname, 'dev', 'boot.js'),
			'js/app': path.join(__dirname, 'dev', 'app.js'),
			'js/admin': path.join(__dirname, 'dev', 'admin.js')
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
				'Opentip$': path.join(__dirname, 'dev', 'External', 'Opentip.js'),
				'ko$': path.join(__dirname, 'dev', 'External', 'ko.js')
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
					test: /\.(html|css)$/,
					loader: 'raw-loader',
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
