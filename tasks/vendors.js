/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');
const header = require('gulp-header');
const stripbom = require('gulp-stripbom');

const { config } = require('./config');
const { del } = require('./common');

// moment
const momentLocalesClear = () => del('rainloop/v/' + config.devVersion + '/app/localization/moment/*.js');

const momentLocales = () => gulp.src(config.paths.js.moment.locales).pipe(gulp.dest(config.paths.momentLocales));

const moment = gulp.series(momentLocalesClear, momentLocales);

// lightgallery
const lightgalleryFontsClear = () => del('rainloop/v/' + config.devVersion + '/static/css/fonts/lg.*');

const lightgalleryFontsCopy = () =>
	gulp
		.src('vendors/lightgallery/dist/fonts/lg.*')
		.pipe(gulp.dest('rainloop/v/' + config.devVersion + '/static/css/fonts'));

const lightgallery = gulp.series(lightgalleryFontsClear, lightgalleryFontsCopy);

// fontastic
const fontasticFontsClear = () => del('rainloop/v/' + config.devVersion + '/static/css/fonts/rainloop.*');

const fontasticFontsCopy = () =>
	gulp
		.src('vendors/fontastic/fonts/rainloop.*')
		.pipe(gulp.dest('rainloop/v/' + config.devVersion + '/static/css/fonts'));

const fontastic = gulp.series(fontasticFontsClear, fontasticFontsCopy);

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

exports.vendors = gulp.parallel(moment, ckeditor, fontastic, lightgallery);
