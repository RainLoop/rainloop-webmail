/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');
const header = require('gulp-header');
const stripbom = require('gulp-stripbom');

const { config } = require('./config');
const { del } = require('./common');

// lightgallery
const lightgalleryFontsClear = () => del('rainloop/v/' + config.devVersion + '/static/css/fonts/lg.*');

const lightgallery = gulp.series(lightgalleryFontsClear);

// fontastic
const fontasticFontsClear = () => del('rainloop/v/' + config.devVersion + '/static/css/fonts/snappymail.*');

const fontasticFontsCopy = () =>
	gulp
		.src('vendors/fontastic/fonts/snappymail.*')
		.pipe(gulp.dest('rainloop/v/' + config.devVersion + '/static/css/fonts'));

const fontastic = gulp.series(fontasticFontsClear, fontasticFontsCopy);

// squire
const squireClear = () => del('rainloop/v/' + config.devVersion + '/static/squire');

const squire = gulp.series(squireClear);

// ckeditor
const ckeditorClear = () => del('rainloop/v/' + config.devVersion + '/static/ckeditor');

const ckeditorCopy = () =>
	gulp
		.src([
			'vendors/ckeditor/**/*',
			'!vendors/ckeditor/samples{,/**}',
			'!vendors/ckeditor/adapters{,/**}',
			'!vendors/ckeditor/*.md'
		])
		.pipe(gulp.dest('rainloop/v/' + config.devVersion + '/static/ckeditor'));

const ckeditorCopyPlugins = () =>
	gulp
		.src('vendors/ckeditor-plugins/**/*')
		.pipe(gulp.dest('rainloop/v/' + config.devVersion + '/static/ckeditor/plugins'));

const ckeditorSetup = () =>
	gulp
		.src('rainloop/v/' + config.devVersion + '/static/ckeditor/*.js')
		.pipe(stripbom())
		// eslint-disable-next-line quotes
		.pipe(header('\uFEFF')) // BOM
		.pipe(gulp.dest('rainloop/v/' + config.devVersion + '/static/ckeditor'));

const ckeditor = gulp.series(ckeditorClear, ckeditorCopy, ckeditorCopyPlugins, ckeditorSetup);

exports.vendors = gulp.parallel(squire, ckeditor, fontastic, lightgallery);
