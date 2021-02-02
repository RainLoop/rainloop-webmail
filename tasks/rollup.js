/* SnappyMail Webmail (c) SnappyMail Team | Licensed under AGPL 3 */
const rollup2 = require('gulp-rollup-2');
const babel = require('rollup-plugin-babel');
const includePaths = require('rollup-plugin-includepaths');
const externalGlobals = require('rollup-plugin-external-globals');
const html = require('rollup-plugin-html');
const { config } = require('./config');

let includePathOptions = {
	include: {},
	paths: ['dev'],
	external: [],
	extensions: ['.js', '.html']
};

let babelConfig = {
	exclude: 'node_modules/**',
	babelrc: false,
	presets: [
		[
			'@babel/preset-env',
			{
				targets: {"chrome": "60"},
				loose: true,
				modules: false
			}
		]
	],
	plugins: [
		[
			'@babel/plugin-proposal-decorators',
			{
				legacy: true
			}
		],
		'@babel/plugin-proposal-class-properties'
	]
};

exports.rollupJS = (inputFile) =>
	rollup2.src({
		external: ['ko'],
		input: 'dev/' + inputFile,
		output: [
			{file: config.paths.staticJS + inputFile, format: 'iife'}
		],
		plugins: [
			babel(babelConfig),
			includePaths(includePathOptions),
			externalGlobals({
				ko: 'ko'
			}),
			html({
				include: '**/*.html'
			})
		]
	});
