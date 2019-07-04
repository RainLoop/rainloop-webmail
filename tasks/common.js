/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');
const rimraf = require('gulp-rimraf');
const fs = require('node-fs');

const { config } = require('./config');

exports.del = (dir) => gulp.src(dir, { read: false, allowEmpty: true }).pipe(rimraf());

exports.copy = (sFile, sNewFile, done) => {
	fs.writeFileSync(sNewFile, fs.readFileSync(sFile));
	done();
};

exports.zip = (srcDir, destDir, fileName) =>
	gulp
		.src(srcDir + '**/*')
		.pipe(require('gulp-zip')(fileName))
		.pipe(gulp.dest(destDir));

exports.getHead = () => (!config.community ? config.head.rainloop : config.head.agpl);

exports.cleanStatic = () => exports.del(config.paths.static);
