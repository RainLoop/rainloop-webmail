/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');

const
	concat = require('gulp-concat-util'),
	header = require('gulp-header'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace'),
	uglify = require('gulp-uglify'),
	plumber = require('gulp-plumber'),
	gulpif = require('gulp-if'),
	eol = require('gulp-eol'),
	eslint = require('gulp-eslint'),
	cache = require('gulp-cached'),
	expect = require('gulp-expect-file'),
	size = require('gulp-size'),
	gutil = require('gulp-util');

const {config} = require('./config');
const {del, getHead} = require('./common');

const {webpack} = require('./webpack');

const jsClean = () => del(config.paths.staticJS + '/**/*.js');

// libs
const jsLibs = () => {
	const src = config.paths.js.libs.src;
	return gulp.src(src)
		.pipe(expect.real({errorOnFailure: true}, src))
		.pipe(concat(config.paths.js.libs.name, {separator: '\n\n'}))
		.pipe(eol('\n', true))
		.pipe(replace(/sourceMappingURL=[a-z0-9\.\-_]{1,20}\.map/ig, ''))
		.pipe(gulp.dest(config.paths.staticJS));
};

// app
const jsApp = () =>
	gulp.src(config.paths.staticJS + config.paths.js.app.name)
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticJS))
		.on('error', gutil.log);

const jsAdmin = () =>
	gulp.src(config.paths.staticJS + config.paths.js.admin.name)
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticJS))
		.on('error', gutil.log);

const jsMin = () =>
	gulp.src(config.paths.staticJS + '*.js')
		.pipe(replace(/"rainloop\/v\/([^\/]+)\/static\/js\/"/g, '"rainloop/v/$1/static/js/min/"'))
		.pipe(size({
			showFiles: true,
			showTotal: false
		}))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify({
			mangle: true,
			compress: true,
			ie8: false
		}))
		.pipe(eol('\n', true))
		.pipe(size({
			showFiles: true,
			showTotal: false
		}))
		.pipe(gulp.dest(config.paths.staticMinJS))
		.on('error', gutil.log);

const jsLint = () =>
	gulp.src(config.paths.globjs)
		.pipe(cache('eslint'))
		.pipe(eslint())
		.pipe(gulpif(config.watch, plumber()))
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());

const jsState1 = gulp.series(jsLint);
const jsState3 = gulp.parallel(jsLibs, jsApp, jsAdmin);
const jsState2 = gulp.series(jsClean, webpack, jsState3, jsMin);

exports.jsLint = jsLint;
exports.js = gulp.parallel(jsState1, jsState2);
