
var
	path = require('path'),
	webpack = require('webpack'),
	devPath = path.resolve(__dirname, 'dev'),
	CopyWebpackPlugin = require('copy-webpack-plugin'),
	WebpackNotifierPlugin = require('webpack-notifier'),
	loose = true;

module.exports = function(publicPath, pro, es6) {
	return {
		entry: es6 ? {
			'js/app.next': path.join(__dirname, 'dev', 'app.js'),
			'js/admin.next': path.join(__dirname, 'dev', 'admin.js')
		} : {
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
			new webpack.optimize.OccurrenceOrderPlugin(),
			new webpack.DefinePlugin({
				'RL_COMMUNITY': !pro,
				'RL_ES6': !!es6,
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
					options: !es6 ? {
						cacheDirectory: true,
						presets: [['es2015', {loose: loose, modules: false}], 'es2016', 'stage-0'],
						plugins: ['transform-runtime', 'transform-decorators-legacy']
					} : {
						cacheDirectory: true,
						plugins: [
// es2015
["transform-es2015-template-literals", {loose: loose}],
"transform-es2015-literals",
"transform-es2015-function-name",
// ["transform-es2015-arrow-functions")],
"transform-es2015-block-scoped-functions",
// ["transform-es2015-classes", {loose: loose}],
// "transform-es2015-object-super",
"transform-es2015-shorthand-properties",
"transform-es2015-duplicate-keys",
["transform-es2015-computed-properties", {loose: loose}],
["transform-es2015-for-of", {loose: loose}],
"transform-es2015-sticky-regex",
"transform-es2015-unicode-regex",
// "check-es2015-constants",
//["transform-es2015-spread", {loose: loose}],
// "transform-es2015-parameters",
//["transform-es2015-destructuring", {loose: loose}],
// "transform-es2015-block-scoping",
"transform-es2015-typeof-symbol",
// ["transform-regenerator", { async: false, asyncGenerators: false }],

// es2016
"transform-exponentiation-operator",

// stage-0
"transform-do-expressions",
"transform-function-bind",

// stage-1
"transform-class-constructor-call",
"transform-export-extensions",

// stage-2
"transform-class-properties",
"transform-object-rest-spread",
// "transform-decorators", // -> transform-decorators-legacy

// stage-3
"syntax-trailing-function-commas",
"transform-async-to-generator",
"transform-exponentiation-operator",

// other
'transform-runtime',
'transform-decorators-legacy' // -> transform-decorators // from stage-2
						]
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
			'Tinycon': 'window.Tinycon',
			'ssm': 'window.ssm',
			'key': 'window.key',
			'_': 'window._',
			'qr': 'window.qr',
			'Promise': 'window.Promise',
			'$': 'window.jQuery'
		}
	};
};
