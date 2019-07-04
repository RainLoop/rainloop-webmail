/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');

const { cleanStatic } = require('./tasks/common');
const { assets } = require('./tasks/assets');
const { js, jsLint } = require('./tasks/js');
const { css, cssLint } = require('./tasks/css');
const { vendors } = require('./tasks/vendors');
const { watchCss } = require('./tasks/watch');
const { rainloop } = require('./tasks/rainloop');
const { owncloud } = require('./tasks/owncloud');

const clean = gulp.series(cleanStatic);

const lint = gulp.parallel(jsLint, cssLint);

const buildState1 = gulp.parallel(js, css, vendors);
const buildState2 = gulp.series(clean, assets, buildState1);

const build = gulp.parallel(lint, buildState2);

exports.css = css;
exports.lint = lint;
exports.build = build;
exports.default = build;

exports.watchCss = watchCss;

exports.rainloop = gulp.series(build, rainloop);
exports.owncloud = gulp.series(build, owncloud);
exports.all = gulp.series(exports.rainloop, exports.owncloud);
