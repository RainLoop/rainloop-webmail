var webpack = require('webpack');

module.exports = {
	entry: {
		'app': __dirname + '/dev/app.js',
		'admin': __dirname + '/dev/admin.js'
	},
	output: {
		pathinfo: true,
		path: __dirname + '/rainloop/v/0.0.0/static/js/',
		filename: '[name].js',
		publicPath: 'rainloop/v/0.0.0/static/js/',
		chunkFilename: '[chunkhash].subapp.js'
	},
//	devtool: "#source-map",
	plugins: [
//		new webpack.optimize.CommonsChunkPlugin('common.js'),
		new webpack.optimize.OccurenceOrderPlugin()
	],
	resolve: {
		modulesDirectories: [__dirname + '/dev/'],
		extensions: ['', '.js', '.jsx'],
		alias: {
			'Opentip': __dirname  + '/dev/External/Opentip.js',
			'ko': __dirname  + '/dev/External/ko.js'
		}
	},
	module: {
		loaders: [
			{
				test: /\.jsx$/,
				loader: 'babel',
				exclude: /(node_modules|bower_components)/,
				query: {
					cacheDirectory: true,
					presets: ['es2015']
				}
			}
		]
	},
	externals: {
		'window': 'window',
		'JSON': 'window.JSON',
		'JSEncrypt': 'window.JSEncrypt',
		'$LAB': 'window.$LAB',
		'progressJs': 'window.rainloopProgressJs',
		'queue': 'window.queue',
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
		'Q': 'window.Q',
		'$': 'window.jQuery'
	}
};