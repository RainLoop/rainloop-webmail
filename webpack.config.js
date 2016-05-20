
var
	path = require('path'),
	webpack = require('webpack')
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
		publicPath: 'rainloop/v/0.0.0/static/js/',
		chunkFilename: '[chunkhash].subapp.js'
	},
//	devtool: "#source-map",
	plugins: [
//		new webpack.optimize.CommonsChunkPlugin('common.js'),
		new webpack.optimize.OccurenceOrderPlugin()
	],
	resolve: {
		root: [path.resolve(__dirname, 'dev'), path.resolve(__dirname, 'vendors')],
		extensions: ['', '.js', '.jsx'],
		alias: {
			'Opentip': __dirname  + '/dev/External/Opentip.js',
			'ko': __dirname  + '/dev/External/ko.js'
		}
	},
	module: {
		loaders: [
			{
				test: /\.html$/,
				loader: 'raw'
			},
			{
				test: /\.jsx$/,
				loader: 'babel',
				exclude: /(node_modules|bower_components)/,
				query: {
					cacheDirectory: true,
//			        plugins: ['transform-runtime'],
					presets: ['es2015-loose', 'stage-0']
				}
			}
		]
	},
	externals: {
		'window': 'window',
		'JSON': 'window.JSON',
		'JSEncrypt': 'window.JSEncrypt',
		'$LAB': 'window.$LAB',
		'progressJs': 'window.progressJs',
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