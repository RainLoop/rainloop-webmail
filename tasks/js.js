/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');

const concat = require('gulp-concat'),
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

const { rollupJS } = require('./rollup');

const jsClean = () => del(config.paths.staticJS + '/**/*.{js,map}');

// boot
const jsBoot = () => {
	return gulp
		.src('dev/boot.js')
		.pipe(gulp.dest(config.paths.staticJS));
};

// ServiceWorker
const jsServiceWorker = () => {
	return gulp
		.src('dev/serviceworker.js')
		.pipe(gulp.dest(config.paths.staticJS));
};

// OpenPGP
const jsOpenPGP = () => {
	return gulp
		.src('vendors/openpgp-2.6.2/dist/openpgp.js')
		.pipe(gulp.dest(config.paths.staticJS));
};

// OpenPGP Worker
const jsOpenPGPWorker = () => {
	return gulp
		.src('vendors/openpgp-2.6.2/dist/openpgp.worker.min.js')
		.pipe(gulp.dest(config.paths.staticMinJS));
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

// app
const jsApp = async () =>
	(await rollupJS(config.paths.js.app.name))
//		.pipe(sourcemaps.write('.'))
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticJS))
		.on('error', gutil.log);

const jsAdmin = async () =>
	(await rollupJS(config.paths.js.admin.name))
//		.pipe(sourcemaps.write('.'))
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

exports.jsLint = jsLint;
exports.js = gulp.series(
	jsClean,
	jsLint,
	gulp.parallel(jsBoot, jsServiceWorker, jsOpenPGP, jsOpenPGPWorker, jsLibs, jsApp, jsAdmin),
	jsMin
);
