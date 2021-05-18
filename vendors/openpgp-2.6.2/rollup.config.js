/*
npm install rollup rollup-plugin-includepaths rollup-plugin-babel rollup-plugin-external-globals rollup-plugin-html rollup-plugin-terser
rollup -c
*/

import includePaths from 'rollup-plugin-includepaths';
import { terser } from "rollup-plugin-terser";
//import resolve from '@rollup/plugin-node-resolve';
//import replace from '@rollup/plugin-replace';
//import commonjs from '@rollup/plugin-commonjs';

let includePathOptions = {
	include: {},
	paths: ['src'],
	external: [],
	extensions: ['.js']
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
    input: 'src/index.js',
	output: [
		{file: 'dist/snappymail/openpgp.js', format: 'iife'}, // format: 'es'
		{file: 'dist/snappymail/openpgp.min.js', format: 'iife', plugins: [terser(terserConfig)], }
	],
    plugins: [
		includePaths(includePathOptions)
//		,commonjs()
/*
      replace({
        'OpenPGP.js VERSION': `OpenPGP.js ${pkg.version}`,
        'require(': 'void(',
        delimiters: ['', '']
      })
*/
    ]
}];
