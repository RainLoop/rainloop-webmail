/* RainLoop Webmail (c) RainLoop Team | Licensed under MIT */
const gulp = require('gulp');

const { config } = require('./config');
const { del } = require('./common');

// fontastic
const fontasticFontsClear = () => del('snappymail/v/' + config.devVersion + '/static/css/fonts/snappymail.*');

const fontasticFontsCopy = () =>
	gulp
		.src('vendors/fontastic/fonts/snappymail.*')
		.pipe(gulp.dest('snappymail/v/' + config.devVersion + '/static/css/fonts'));

const fontastic = gulp.series(fontasticFontsClear, fontasticFontsCopy);

exports.vendors = gulp.parallel(fontastic);
