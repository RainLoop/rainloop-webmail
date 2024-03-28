/* SnappyMail Webmail (c) SnappyMail Team | Licensed under AGPL v3 */
const rollup2 = require('gulp-rollup-2');
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

exports.rollupJS = (inputFile) =>
	rollup2.src({
		external: ['ko'],
		input: 'dev/' + inputFile,
		output: [
			{file: config.paths.staticJS + inputFile, format: 'iife'}
		],
		plugins: [
			includePaths(includePathOptions),
			externalGlobals({
				ko: 'ko'
			}),
			html({
				include: '**/*.html'
			})
		]
	});
