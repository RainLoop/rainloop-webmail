/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');
const { config } = require('./config');

const assetsCopy = () => gulp.src(config.paths.assets.src).pipe(gulp.dest(config.paths.static));

exports.assets = gulp.series(assetsCopy);
