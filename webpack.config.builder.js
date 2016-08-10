
var
	path = require('path'),
	webpack = require('webpack'),
	devPath = path.resolve(__dirname, 'dev');

module.exports = function(es6) {
	return {
		entry: es6 ? {
			'app.next': __dirname + '/dev/app.jsx',
			'admin.next': __dirname + '/dev/admin.jsx'
		} : {
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
		plugins: [
			new webpack.optimize.OccurrenceOrderPlugin()
		],
		resolve: {
			modules: [devPath, 'node_modules'],
			extensions: ['', '.js', '.jsx'],
			alias: {
				'Opentip': __dirname  + '/dev/External/Opentip.js',
				'ko': __dirname  + '/dev/External/ko.js'
			}
		},
		module: {
			loaders: [
				{
					test: /\.jsx?$/,
					loader: 'babel',
					include: [devPath],
					query: !es6 ? {
						cacheDirectory: true,
						presets: [['es2015', {loose: true, modules: false}], 'es2016', 'stage-0'],
						plugins: ['transform-runtime']
					} : {
						cacheDirectory: true,
						plugins: [
// es2015
["transform-es2015-template-literals", {loose: true}],
"transform-es2015-literals",
"transform-es2015-function-name",
// ["transform-es2015-arrow-functions")],
"transform-es2015-block-scoped-functions",
// ["transform-es2015-classes", loose],
// "transform-es2015-object-super",
"transform-es2015-shorthand-properties",
"transform-es2015-duplicate-keys",
["transform-es2015-computed-properties", {loose: true}],
["transform-es2015-for-of", {loose: true}],
"transform-es2015-sticky-regex",
"transform-es2015-unicode-regex",
// "check-es2015-constants",
//["transform-es2015-spread", {loose: true}],
// "transform-es2015-parameters",
//["transform-es2015-destructuring", {loose: true}],
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
"transform-decorators",

// stage-3
"syntax-trailing-function-commas",
"transform-async-to-generator",
"transform-exponentiation-operator",

// runtime
'transform-runtime'
						]
					}
				},
				{
					test: /\.(html|css)$/,
					loader: 'raw',
					include: [devPath]
				},
				{
					test: /\.json$/,
					loader: 'json',
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
	}
};
