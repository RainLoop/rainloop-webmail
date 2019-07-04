/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');

const concat = require('gulp-concat-util');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const plumber = require('gulp-plumber');
const gulpif = require('gulp-if');
const eol = require('gulp-eol');
const livereload = require('gulp-livereload');
const filter = require('gulp-filter');
const expect = require('gulp-expect-file');

const { config } = require('./config');
const { del } = require('./common');

const cssClean = () => del(config.paths.staticCSS + '/*.css');

const cssMainBuild = () => {
	const autoprefixer = require('gulp-autoprefixer'),
		less = require('gulp-less'),
		lessFilter = filter('**/*.less', { restore: true }),
		src = config.paths.css.main.src.concat([config.paths.less.main.src]);

	return gulp
		.src(src)
		.pipe(expect.real({ errorOnFailure: true }, src))
		.pipe(lessFilter)
		.pipe(gulpif(config.watch, plumber()))
		.pipe(
			less({
				'paths': config.paths.less.main.options.paths
			})
		)
		.pipe(lessFilter.restore)
		.pipe(concat(config.paths.css.main.name))
		.pipe(autoprefixer())
		.pipe(replace(/\.\.\/(img|images|fonts|svg)\//g, '$1/'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticCSS))
		.pipe(livereload());
};

const cssSocialBuild = () => {
	const autoprefixer = require('gulp-autoprefixer'),
		src = config.paths.css.social.src;
	return gulp
		.src(src)
		.pipe(expect.real({ errorOnFailure: true }, src))
		.pipe(concat(config.paths.css.social.name))
		.pipe(autoprefixer())
		.pipe(replace(/\.\.\/(img|images|fonts|svg)\//g, '$1/'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticCSS));
};

const cssMainMin = () => {
	const cleanCss = require('gulp-clean-css');
	return gulp
		.src(config.paths.staticCSS + config.paths.css.main.name)
		.pipe(cleanCss())
		.pipe(rename({ suffix: '.min' }))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticCSS));
};

const cssSocialMin = () => {
	const cleanCss = require('gulp-clean-css');
	return gulp
		.src(config.paths.staticCSS + config.paths.css.social.name)
		.pipe(cleanCss())
		.pipe(rename({ suffix: '.min' }))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(config.paths.staticCSS));
};

const cssBuild = gulp.parallel(cssMainBuild, cssSocialBuild);
const cssMin = gulp.parallel(cssMainMin, cssSocialMin);

const cssLint = (done) => done();

const cssState1 = gulp.series(cssLint);
const cssState2 = gulp.series(cssClean, cssBuild, cssMin);

exports.cssLint = cssLint;
exports.cssBuild = cssBuild;

exports.css = gulp.parallel(cssState1, cssState2);
