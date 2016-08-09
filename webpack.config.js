
var
	path = require('path'),
	webpack = require('webpack'),
	jsLoaderQuery = {
		cacheDirectory: true,
		presets: ['es2015-loose-native-modules', 'stage-0']
	}
;

module.exports = {
	entry: {
		'boot': __dirname + '/dev/boot.jsx',
		'app': __dirname + '/dev/app.jsx',
		'admin': __dirname + '/dev/admin.jsx'
	},
	output: {
		pathinfo: true,
		path: __dirname + '/rainloop/v/0.0.0/static/js/',
		filename: '[name].js',
		publicPath: 'rainloop/v/0.0.0/static/js/'
	},
//	devtool: "#source-map",
	plugins: [
//		new webpack.optimize.CommonsChunkPlugin('common.js'),
		new webpack.optimize.OccurrenceOrderPlugin()
	],
	resolve: {
		modules: [path.resolve(__dirname, 'dev'), 'node_modules'],
		extensions: ['', '.js', '.jsx'],
		alias: {
			'Opentip': __dirname  + '/dev/External/Opentip.js',
			'ko': __dirname  + '/dev/External/ko.js'
		}
	},
	module: {
		loaders: [
			{
				test: /\.(html|css)$/,
				loader: 'raw',
				exclude: /(node_modules|bower_components|vendors)/
			},
			{
				test: /\.json$/,
				loader: 'json',
				exclude: /(node_modules|bower_components|vendors)/
			},
			{
				test: /\.jsx$/,
				loader: 'babel',
				exclude: /(node_modules|bower_components|vendors)/,
				query: jsLoaderQuery
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