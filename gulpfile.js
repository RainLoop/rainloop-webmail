/* RainLoop Webmail (c) RainLoop Team | Licensed under MIT */
const gulp = require('gulp');

const { cleanStatic } = require('./tasks/common');
const { js, jsLint } = require('./tasks/js');
const { css, cssLint } = require('./tasks/css');
const { vendors } = require('./tasks/vendors');

const clean = gulp.series(cleanStatic);

const lint = gulp.parallel(jsLint, cssLint);

const buildState1 = gulp.parallel(js, css, vendors);
const buildState2 = gulp.series(clean, buildState1);

const build = gulp.parallel(lint, buildState2);

exports.css = css;
exports.lint = lint;
exports.build = build;
exports.default = build;
