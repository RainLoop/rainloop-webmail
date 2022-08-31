/* RainLoop Webmail (c) RainLoop Team | Licensed under MIT */
const gulp = require('gulp');

const { config } = require('./config');
const { cssBuild } = require('./css');

const watchCss = gulp.series(cssBuild, (cb) => {
	gulp.watch(config.paths.less.main.watch, { interval: config.watchInterval }, cssBuild);
	cb();
});

exports.watchCss = watchCss;
