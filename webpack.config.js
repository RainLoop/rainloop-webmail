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
		chunkFilename: '[chunkhash].chunk.js'
	},
	plugins: [
		new webpack.optimize.OccurenceOrderPlugin()
	],
	resolve: {
		modulesDirectories: [__dirname + '/dev/'],
		extensions: ['', '.js'],
		alias: {
			"ko": __dirname  + "/dev/External/ko.js"
		}
	},
	externals: {
		'window': 'window',
		'JSON': 'JSON',
		'JSEncrypt': 'window.JSEncrypt',
		'$LAB': 'window.$LAB',
		'SimplePace': 'window.SimplePace',
		'moment': 'moment',
		'ifvisible': 'ifvisible',
		'crossroads': 'crossroads',
		'hasher': 'hasher',
		'Jua': 'Jua',
		'Autolinker': 'Autolinker',
		'ssm': 'ssm',
		'key': 'key',
		'_': '_',
		'$': 'jQuery'
	}
};