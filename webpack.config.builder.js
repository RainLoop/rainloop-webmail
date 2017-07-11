
var
	path = require('path'),
	webpack = require('webpack'),
	devPath = path.resolve(__dirname, 'dev'),
	CopyWebpackPlugin = require('copy-webpack-plugin'),
	WebpackNotifierPlugin = require('webpack-notifier'),
	loose = true;

process.noDeprecation = true;
module.exports = function(publicPath, pro) {
	return {
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
		plugins: [
			// new webpack.optimize.ModuleConcatenationPlugin(),
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
				'Opentip$': __dirname  + '/dev/External/Opentip.js',
				'ko$': __dirname  + '/dev/External/ko.js'
			}
		},
		module: {
			rules: [
				{
					test: /\.js$/,
					loader: 'babel-loader',
					include: [devPath],
					options: {
						cacheDirectory: true,
						presets: [['env', {
							loose: loose,
							modules: false,
							targets: {
								browsers: ['last 3 versions', 'ie >= 9', 'firefox esr']
							}
						}], 'stage-0'],
						plugins: ['transform-runtime', 'transform-decorators-legacy']
					}
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
