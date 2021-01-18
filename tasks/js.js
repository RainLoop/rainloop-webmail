/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');

const concat = require('gulp-concat-util'),
	header = require('gulp-header'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace'),
	terser = require('gulp-terser'),
	eol = require('gulp-eol'),
	eslint = require('gulp-eslint'),
	cache = require('gulp-cached'),
	expect = require('gulp-expect-file'),
	size = require('gulp-size'),
	gutil = require('gulp-util');

const { config } = require('./config');
const { del, getHead } = require('./common');

const { webpack } = require('./webpack');

const jsClean = () => del(config.paths.staticJS + '/**/*.{js,map}');

// boot
const jsBoot = () => {
	return gulp
		.src('dev/boot.js')
		.pipe(gulp.dest('snappymail/v/' + config.devVersion + '/static/js'));
};

// ServiceWorker
const jsServiceWorker = () => {
	return gulp
		.src('dev/serviceworker.js')
		.pipe(gulp.dest('snappymail/v/' + config.devVersion + '/static/js'));
};

// libs
const jsLibs = () => {
	const src = config.paths.js.libs.src;
	return gulp
		.src(src)
		.pipe(expect.real({ errorOnFailure: true }, src))
		.pipe(concat(config.paths.js.libs.name, { separator: '\n\n' }))
		.pipe(eol('\n', true))
		.pipe(replace(/sourceMappingURL=[a-z0-9.\-_]{1,20}\.map/gi, ''))
		.pipe(gulp.dest(config.paths.staticJS));
};

// sieve
const jsSieve = () => {
	const src = config.paths.js.sieve.src;
	return gulp
		.src(src)
		.pipe(expect.real({ errorOnFailure: true }, src))
		.pipe(concat(config.paths.js.sieve.name, { separator: '\n\n' }))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticJS));
};

// app
const jsApp = () =>
	gulp
		.src(config.paths.staticJS + config.paths.js.app.name)
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticJS))
		.on('error', gutil.log);

const jsAdmin = () =>
	gulp
		.src(config.paths.staticJS + config.paths.js.admin.name)
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticJS))
		.on('error', gutil.log);

const jsMin = () =>
	gulp
		.src(config.paths.staticJS + '*.js')
		.pipe(
			size({
				showFiles: true,
				showTotal: false
			})
		)
		.pipe(replace(/"snappymail\/v\/([^/]+)\/static\/js\/"/g, '"snappymail/v/$1/static/js/min/"'))
		.pipe(rename({ suffix: '.min' }))
		.pipe(
			terser({
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
//				,mangle: {reserved:['SendMessage']}
			})
		)
		.pipe(eol('\n', true))
		.pipe(
			size({
				showFiles: true,
				showTotal: false
			})
		)
		.pipe(gulp.dest(config.paths.staticMinJS))
		.on('error', gutil.log);

const jsLint = () =>
	gulp
		.src(config.paths.globjs)
		.pipe(cache('eslint'))
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());

const jsState1 = gulp.series(jsLint);
const jsState3 = gulp.parallel(jsBoot, jsServiceWorker, jsLibs, jsSieve, jsApp, jsAdmin);
const jsState2 = gulp.series(jsClean, webpack, jsState3, jsMin);

exports.jsLint = jsLint;
exports.js = gulp.parallel(jsState1, jsState2);
