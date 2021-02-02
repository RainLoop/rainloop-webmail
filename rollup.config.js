/*
npm install rollup rollup-plugin-includepaths rollup-plugin-babel rollup-plugin-external-globals rollup-plugin-html rollup-plugin-terser
rollup -c
*/

import babel from 'rollup-plugin-babel';
import includePaths from 'rollup-plugin-includepaths';
import externalGlobals from "rollup-plugin-external-globals";
import html from 'rollup-plugin-html';
import { terser } from "rollup-plugin-terser";

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

let terserConfig = {
	output: {
		comments: false
	},
	keep_classnames: true, // Required for AbstractModel and AbstractCollectionModel
	compress:{
		ecma: 6,
		drop_console: true
/*
		,hoist_props: false
		,keep_fargs: false
		,toplevel: true
		,unsafe_arrows: true // Issue with knockoutjs
		,unsafe_methods: true
		,unsafe_proto: true
*/
	}
//	,mangle: {reserved:['SendMessage']}
};

export default [{
	external: ['ko'],
	input: 'dev/admin.js',
//	dest: 'snappymail/v/0.0.0/static/js/admin.rollup.js',
	output: [
		{file: 'snappymail/v/0.0.0/static/js/admin.js', format: 'iife'}, // format: 'es'
		{file: 'snappymail/v/0.0.0/static/js/min/admin.min.js', format: 'iife', plugins: [terser(terserConfig)], }
	],
	plugins: [
		babel(babelConfig),
		includePaths(includePathOptions),
		externalGlobals({
			ko: 'ko'
		})
	],
}, {
	external: ['ko'],
	input: 'dev/app.js',
	output: [
		{file: 'snappymail/v/0.0.0/static/js/app.js', format: 'iife'},
		{file: 'snappymail/v/0.0.0/static/js/min/app.min.js', format: 'iife', plugins: [terser(terserConfig)], }
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
}];
