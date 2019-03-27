/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
/* eslint-disable  */
'use strict';

var
	pkg = require('./package.json'),
	head = {
		rainloop: '/* RainLoop Webmail (c) RainLoop Team | Licensed under RainLoop Software License */',
		agpl: '/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL v3 */'
	},
	cfg = {
		devVersion: '0.0.0',
		releasesPath: 'build/dist/releases',
		community: true,
		watch: false,
		watchInterval: 1000,
		googleCompile: false,

		rainloopBuilded: false,
		destPath: '',
		cleanPath: '',
		zipSrcPath: '',
		zipFile: '',
		zipFileShort: '',

		paths: {}
	},

	_ = require('lodash'),
	fs = require('node-fs'),
	path = require('path'),
	notifier = require('node-notifier'),
	runSequence = require('run-sequence'),

	webpack = require('webpack'),
	webpackCfgBuilder = require('./webpack.config.builder.js'),

	argv = require('yargs').argv,

	gulp = require('gulp'),
	concat = require('gulp-concat-util'),
	header = require('gulp-header'),
	stripbom = require('gulp-stripbom'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace'),
	uglify = require('gulp-uglify'),
	notify = require("gulp-notify"),
	plumber = require('gulp-plumber'),
	gulpif = require('gulp-if'),
	eol = require('gulp-eol'),
	livereload = require('gulp-livereload'),
	eslint = require('gulp-eslint'),
	cache = require('gulp-cached'),
	filter = require('gulp-filter'),
	expect = require('gulp-expect-file'),
	chmod = require('gulp-chmod'),
	size = require('gulp-size'),
	gutil = require('gulp-util');

cfg.community = !argv.pro;

// webpack
function webpackCallback(callback)
{
	return function(err, stats) {

		if (err)
		{
			if (cfg.watch)
			{
				webpackError(err);
			}
			else
			{
				throw new gutil.PluginError('webpack', err);
			}
		}
		else if (stats && stats.compilation && stats.compilation.errors && stats.compilation.errors[0])
		{
			if (cfg.watch)
			{
				_.each(stats.compilation.errors, webpackError);
			}
			else
			{
				throw new gutil.PluginError('webpack', stats.compilation.errors[0]);
			}
		}

		callback();
	};
}

function webpackError(err) {
	if (err)
	{
		gutil.log('[webpack]', '---');
		gutil.log('[webpack]', err.error ? err.error.toString() : '');
		gutil.log('[webpack]', err.message || '');
		gutil.log('[webpack]', '---');

		notifier.notify({
			'sound': true,
			'title': 'webpack',
			'message': err.error ? err.error.toString() : err.message
		});
	}
}

function getHead()
{
	return !cfg.community ? head.rainloop : head.agpl;
}

function zipDir(sSrcDir, sDestDir, sFileName)
{
	return gulp.src(sSrcDir + '**/*')
		.pipe(require('gulp-zip')(sFileName))
		.pipe(gulp.dest(sDestDir));
}

function cleanDir(sDir)
{
	return gulp.src(sDir, {read: false})
		.pipe(require('gulp-rimraf')());
}

function copyFile(sFile, sNewFile, callback)
{
	fs.writeFileSync(sNewFile, fs.readFileSync(sFile));
	callback();
}

cfg.paths.globjs = 'dev/**/*.js';
cfg.paths.static = 'rainloop/v/' + cfg.devVersion + '/static/';
cfg.paths.staticJS = 'rainloop/v/' + cfg.devVersion + '/static/js/';
cfg.paths.staticMinJS = 'rainloop/v/' + cfg.devVersion + '/static/js/min/';
cfg.paths.staticCSS = 'rainloop/v/' + cfg.devVersion + '/static/css/';
cfg.paths.momentLocales = 'rainloop/v/' + cfg.devVersion + '/app/localization/moment/';

cfg.paths.assets = {
	src: 'assets/**/*.*'
};

cfg.paths.less = {
	main: {
		src: 'dev/Styles/@Main.less',
		watch: ['dev/Styles/*.less'],
		options: {
			paths: [
				path.join(__dirname, 'dev', 'Styles'),
				path.join(__dirname, 'vendors', 'bootstrap', 'less')
			]
		}
	}
};

cfg.paths.css = {
	main: {
		name: 'app.css',
		src: [
			'node_modules/normalize.css/normalize.css',
			'vendors/jquery-ui/css/smoothness/jquery-ui-1.10.3.custom.css',
			'vendors/fontastic/styles.css',
			'vendors/jquery-nanoscroller/nanoscroller.css',
			'vendors/jquery-letterfx/jquery-letterfx.min.css',
			'vendors/inputosaurus/inputosaurus.css',
			'vendors/flags/flags-fixed.css',
			'node_modules/opentip/css/opentip.css',
			'node_modules/pikaday/css/pikaday.css',
			'vendors/lightgallery/dist/css/lightgallery.min.css',
			'vendors/lightgallery/dist/css/lg-transitions.min.css',
			'vendors/Progress.js/minified/progressjs.min.css',
			'dev/Styles/_progressjs.css'
		]
	},
	social: {
		name: 'social.css',
		src: [
			'vendors/fontastic/styles.css',
			'dev/Styles/_social.css'
		]
	}
};

cfg.paths.js = {
	moment: {
		locales: [
			'node_modules/moment/locale/*.js'
		]
	},
	libs: {
		name: 'libs.js',
		src: [
			'node_modules/jquery/dist/jquery.min.js',
			'node_modules/jquery-migrate/dist/jquery-migrate.min.js',
			'node_modules/jquery-mousewheel/jquery.mousewheel.js',
			'node_modules/jquery-scrollstop/jquery.scrollstop.js',
			'node_modules/jquery-backstretch/jquery.backstretch.min.js',
			'vendors/jquery-ui/js/jquery-ui-1.10.3.custom.min.js', // custom
			'vendors/jquery-nanoscroller/jquery.nanoscroller.js', // custom (modified)
			'vendors/jquery-wakeup/jquery.wakeup.js', // no-npm
			'vendors/jquery-letterfx/jquery-letterfx.min.js', // no-npm
			'vendors/inputosaurus/inputosaurus.js', // custom (modified)
			'vendors/routes/signals.min.js', // fixed
			'vendors/routes/hasher.min.js', // fixed
			'vendors/routes/crossroads.min.js', // fixed
			'vendors/jua/jua.min.js', // custom
			'vendors/keymaster/keymaster.js', // custom (modified)
			'vendors/qr.js/qr.min.js', // fixed
			'vendors/bootstrap/js/bootstrap.min.js', // fixed
			'node_modules/underscore/underscore-min.js',
			'node_modules/moment/min/moment.min.js',
			'node_modules/knockout/build/output/knockout-latest.js',
			'node_modules/knockout-transformations/dist/knockout-transformations.min.js',
			'node_modules/knockout-sortable/build/knockout-sortable.min.js ',
			'node_modules/matchmedia-polyfill/matchMedia.js',
			'node_modules/matchmedia-polyfill/matchMedia.addListener.js',
			'node_modules/simplestatemanager/dist/ssm.min.js',
			'node_modules/autolinker/dist/Autolinker.min.js',
			'node_modules/opentip/lib/opentip.js',
			'node_modules/opentip/lib/adapter-jquery.js',
			'vendors/lightgallery/dist/js/lightgallery.min.js',
			'vendors/lightgallery/dist/js/lg-fullscreen.min.js',
			'vendors/lightgallery/dist/js/lg-thumbnail.min.js',
			'vendors/lightgallery/dist/js/lg-zoom.min.js',
			'vendors/lightgallery/dist/js/lg-autoplay.min.js',
			'node_modules/ifvisible.js/src/ifvisible.min.js'
		]
	},
	app: {
		name: 'app.js'
	},
	admin: {
		name: 'admin.js'
	}
};


// assets

gulp.task('assets:clean', function() {
	return cleanDir(cfg.paths.static);
});

gulp.task('assets', function() {
	return gulp.src(cfg.paths.assets.src)
		.pipe(gulp.dest(cfg.paths.static));
});

// CSS

gulp.task('css:clean', function() {
	return cleanDir(cfg.paths.staticCSS + '/*.css');
});

gulp.task('css:main', ['assets'], function() {
	var autoprefixer = require('gulp-autoprefixer'),
		less = require('gulp-less'),
		lessFilter = filter('**/*.less', {restore: true}),
		src = cfg.paths.css.main.src.concat([cfg.paths.less.main.src]);

	return gulp.src(src)
		.pipe(expect.real({errorOnFailure: true}, src))
		.pipe(lessFilter)
		.pipe(gulpif(cfg.watch, plumber({errorHandler: notify.onError("Error: <%= error.message %>")})))
		.pipe(less({
			'paths': cfg.paths.less.main.options.paths
		}))
		.pipe(lessFilter.restore)
		.pipe(concat(cfg.paths.css.main.name))
		.pipe(autoprefixer('last 3 versions', 'ie >= 9', 'Firefox ESR'))
		.pipe(replace(/\.\.\/(img|images|fonts|svg)\//g, '$1/'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS))
		.pipe(livereload());
});

gulp.task('css:social', function() {
	var autoprefixer = require('gulp-autoprefixer'),
		src = cfg.paths.css.social.src;
	return gulp.src(src)
		.pipe(expect.real({errorOnFailure: true}, src))
		.pipe(concat(cfg.paths.css.social.name))
		.pipe(autoprefixer('last 3 versions', 'ie >= 9', 'Firefox ESR'))
		.pipe(replace(/\.\.\/(img|images|fonts|svg)\//g, '$1/'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

gulp.task('css:main:min', ['css:main'], function() {
	var cleanCss = require('gulp-clean-css');
	return gulp.src(cfg.paths.staticCSS + cfg.paths.css.main.name)
		.pipe(cleanCss())
		.pipe(rename({suffix: '.min'}))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

gulp.task('css:social:min', ['css:social'], function() {
	var cleanCss = require('gulp-clean-css');
	return gulp.src(cfg.paths.staticCSS + cfg.paths.css.social.name)
		.pipe(cleanCss())
		.pipe(rename({suffix: '.min'}))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

gulp.task('css:min', ['css:main:min', 'css:social:min']);

// JS
gulp.task('moment:locales-clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/app/localization/moment/*.js');
});

gulp.task('moment:locales', ['moment:locales-clear'], function() {
	return gulp.src(cfg.paths.js.moment.locales)
		.pipe(gulp.dest(cfg.paths.momentLocales));
});

gulp.task('js:libs', function() {
	var src = cfg.paths.js.libs.src;
	return gulp.src(src)
		.pipe(expect.real({errorOnFailure: true}, src))
		.pipe(concat(cfg.paths.js.libs.name, {separator: '\n\n'}))
		.pipe(eol('\n', true))
		.pipe(replace(/sourceMappingURL=[a-z0-9\.\-_]{1,20}\.map/ig, ''))
		.pipe(gulp.dest(cfg.paths.staticJS));
});

gulp.task('js:clean', function() {
	return cleanDir(cfg.paths.staticJS + '/**/*.js');
});

gulp.task('js:webpack', function(callback) {
	webpack(webpackCfgBuilder(cfg.paths.staticJS, !cfg.community, false), webpackCallback(callback));
});

gulp.task('js:app', ['js:webpack'], function() {
	return gulp.src(cfg.paths.staticJS + cfg.paths.js.app.name)
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

gulp.task('js:admin', ['js:webpack'], function() {
	return gulp.src(cfg.paths.staticJS + cfg.paths.js.admin.name)
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

// - min
gulp.task('js:min', ['js:app', 'js:admin'], function() {
	return gulp.src(cfg.paths.staticJS + '*.js')
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
		.pipe(gulp.dest(cfg.paths.staticMinJS))
		.on('error', gutil.log);
});

// lint
gulp.task('js:eslint', function() {
	return gulp.src(cfg.paths.globjs)
		.pipe(cache('eslint'))
		.pipe(eslint())
		.pipe(gulpif(cfg.watch, plumber({errorHandler: notify.onError("Error: <%= error.message %>")})))
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

gulp.task('js:validate', ['js:eslint']);

// other
gulp.task('lightgallery-fonts:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/css/fonts/lg.*');
});

gulp.task('fontastic-fonts:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/css/fonts/rainloop.*');
});

gulp.task('lightgallery-fonts:copy', ['lightgallery-fonts:clear'], function() {
	return gulp.src('vendors/lightgallery/dist/fonts/lg.*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/css/fonts'));
});

gulp.task('fontastic-fonts:copy', ['fontastic-fonts:clear'], function() {
	return gulp.src('vendors/fontastic/fonts/rainloop.*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/css/fonts'));
});

gulp.task('lightgallery', ['lightgallery-fonts:copy']);
gulp.task('fontastic', ['fontastic-fonts:copy']);

gulp.task('ckeditor:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/ckeditor');
});

gulp.task('ckeditor:copy', ['ckeditor:clear'], function() {
	return gulp.src(['vendors/ckeditor/**/*', '!vendors/ckeditor/samples{,/**}', '!vendors/ckeditor/adapters{,/**}', '!vendors/ckeditor/*.md'])
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/ckeditor'));
});

gulp.task('ckeditor:copy-plugins', ['ckeditor:copy'], function() {
	return gulp.src('vendors/ckeditor-plugins/**/*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/ckeditor/plugins'));
});

gulp.task('ckeditor', ['ckeditor:copy-plugins', 'ckeditor:copy', 'ckeditor:clear'], function () {
	return gulp.src('rainloop/v/' + cfg.devVersion + '/static/ckeditor/*.js')
		.pipe(stripbom())
		.pipe(header("\uFEFF")) // BOM
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/ckeditor'));
});

// build (RainLoop)
gulp.task('rainloop:copy', ['default'], function() {

	var
		versionFull = pkg.version,
		dist = cfg.releasesPath + '/webmail/' + versionFull + '/src/'
	;

	fs.mkdirSync(dist, '0777', true);
	fs.mkdirSync(dist + 'data');
	fs.mkdirSync(dist + 'rainloop/v/' + versionFull, '0777', true);

	return gulp.src('rainloop/v/' + cfg.devVersion + '/**/*', {base: 'rainloop/v/' + cfg.devVersion})
		.pipe(chmod(0o644, 0o755))
		.pipe(gulp.dest(dist + 'rainloop/v/' + versionFull));
});

gulp.task('rainloop:setup', ['rainloop:copy'], function() {

	var
		versionFull = pkg.version,
		dist = cfg.releasesPath + '/webmail/' + versionFull + '/src/'
	;

	fs.writeFileSync(dist + 'data/VERSION', versionFull);
	fs.writeFileSync(dist + 'data/EMPTY', versionFull);

	fs.writeFileSync(dist + 'index.php', fs.readFileSync('index.php', 'utf8')
		.replace('\'APP_VERSION\', \'0.0.0\'', '\'APP_VERSION\', \'' + versionFull + '\'')
		.replace('\'APP_VERSION_TYPE\', \'source\'', '\'APP_VERSION_TYPE\', \'' + (cfg.community ? 'community' : 'standard') + '\'')
	);

	fs.writeFileSync(dist + 'rainloop/v/' + versionFull + '/index.php.root', fs.readFileSync(dist + 'index.php'));

	if (cfg.community)
	{
		require('rimraf').sync(dist + 'rainloop/v/' + versionFull + '/app/libraries/RainLoop/Providers/Prem.php');
	}

	cfg.destPath = cfg.releasesPath + '/webmail/' + versionFull + '/';
	cfg.cleanPath = dist;
	cfg.zipSrcPath = dist;
	cfg.zipFile = 'rainloop-' + (cfg.community ? 'community-' : '') + versionFull + '.zip';
	cfg.zipFileShort = 'rainloop-' + (cfg.community ? 'community-' : '') + 'latest.zip';

	cfg.rainloopBuilded = true;
});

gulp.task('rainloop:zip', ['rainloop:copy', 'rainloop:setup'], function() {
	return (cfg.destPath && cfg.zipSrcPath && cfg.zipFile) ?
		zipDir(cfg.zipSrcPath, cfg.destPath, cfg.zipFile) : false;
});

gulp.task('rainloop:clean', ['rainloop:copy', 'rainloop:setup', 'rainloop:zip'], function() {
	return (cfg.cleanPath) ? cleanDir(cfg.cleanPath) : false;
});

gulp.task('rainloop:shortname', ['rainloop:zip'], function(callback) {
	copyFile(cfg.destPath + cfg.zipFile, cfg.destPath + cfg.zipFileShort, callback);
});

// build (OwnCloud)
gulp.task('rainloop:owncloud:copy', function() {

	var
		versionFull = pkg.ownCloudVersion,
		dist = cfg.releasesPath + '/owncloud/' + versionFull + '/src/'
	;

	fs.mkdirSync(dist, '0777', true);
	fs.mkdirSync(dist + 'rainloop', '0777', true);

	return gulp.src('build/owncloud/rainloop-app/**/*', {base: 'build/owncloud/rainloop-app/'})
		.pipe(gulp.dest(dist + 'rainloop'));
});

gulp.task('rainloop:owncloud:copy-rainloop', ['rainloop:start', 'rainloop:owncloud:copy'], function() {

	var
		versionFull = pkg.ownCloudVersion,
		dist = cfg.releasesPath + '/owncloud/' + versionFull + '/src/rainloop/'
	;

	if (cfg.rainloopBuilded && cfg.destPath)
	{
		return gulp.src(cfg.destPath + '/src/**/*', {base: cfg.destPath + '/src/'})
			.pipe(gulp.dest(dist + 'app/'));
	}

	return true;
});

gulp.task('rainloop:owncloud:copy-rainloop:clean', ['rainloop:owncloud:copy-rainloop'], function() {
	return (cfg.cleanPath) ? cleanDir(cfg.cleanPath) : false;
});

gulp.task('rainloop:owncloud:setup', ['rainloop:owncloud:copy', 'rainloop:owncloud:copy-rainloop'], function() {

	var
		versionFull = pkg.ownCloudVersion,
		dist = cfg.releasesPath + '/owncloud/' + versionFull + '/src/'
	;

	fs.writeFileSync(dist + 'rainloop/appinfo/info.xml',
		fs.readFileSync(dist + 'rainloop/appinfo/info.xml', 'utf8')
			.replace('<version>0.0</version>', '<version>' + versionFull + '</version>')
			.replace('<licence></licence>', '<licence>' + (cfg.community ? 'AGPLv3' : 'RainLoop Software License') + '</licence>')
		);

	fs.writeFileSync(dist + 'rainloop/appinfo/version', versionFull);
	fs.writeFileSync(dist + 'rainloop/VERSION', versionFull);

	cfg.destPath = cfg.releasesPath + '/owncloud/' + versionFull + '/';
	cfg.cleanPath = dist;
	cfg.zipSrcPath = dist;
	cfg.zipFile = 'rainloop-owncloud-app-' + (cfg.community ? '' : 'standard-') + versionFull + '.zip';
	cfg.zipFileShort = 'rainloop' + (cfg.community ? '' : '-standard') + '.zip';
});

gulp.task('rainloop:owncloud:zip', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup'], function() {
	return (cfg.destPath && cfg.zipSrcPath && cfg.zipFile) ?
		zipDir(cfg.zipSrcPath, cfg.destPath, cfg.zipFile) : false;
});

gulp.task('rainloop:owncloud:clean', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup', 'rainloop:owncloud:zip'], function() {
	return (cfg.cleanPath) ? cleanDir(cfg.cleanPath) : false;
});

gulp.task('rainloop:owncloud:shortname', ['rainloop:owncloud:zip'], function(callback) {
	copyFile(cfg.destPath + cfg.zipFile, cfg.destPath + cfg.zipFileShort, callback);
});

gulp.task('plugins:build', [], function() {

	var name = argv.name || '';
	if (true === name || !name) {
		throw new Error('Empty name parameter');
	}

	var
		source = 'plugins/' + name,
		vesrion = fs.readFileSync(source + '/VERSION', 'utf8')
	;

	cfg.destPath = 'build/dist/plugins/';
	cfg.zipFile = name + '-' + vesrion + '.zip';

	fs.mkdirSync(cfg.destPath, '0777', true);

	return gulp.src(source + '/**/*', {base: source})
		.pipe(require('gulp-zip')(cfg.zipFile))
		.pipe(gulp.dest(cfg.destPath));
});

// main
gulp.task('moment', ['moment:locales']);
gulp.task('js', ['js:libs', 'js:min', 'js:validate']);
gulp.task('css', ['css:min']);

gulp.task('vendors', ['moment', 'ckeditor', 'fontastic', 'lightgallery']);

gulp.task('clean', ['js:clean', 'css:clean', 'assets:clean']);

gulp.task('rainloop:start', ['rainloop:copy', 'rainloop:setup']);

gulp.task('rainloop', ['rainloop:start', 'rainloop:zip', 'rainloop:clean', 'rainloop:shortname']);

gulp.task('owncloud', ['rainloop:owncloud:copy',
	'rainloop:owncloud:copy-rainloop', 'rainloop:owncloud:copy-rainloop:clean',
	'rainloop:owncloud:setup', 'rainloop:owncloud:zip', 'rainloop:owncloud:clean', 'rainloop:owncloud:shortname']);

// default
gulp.task('default', function(callback) {
	runSequence('clean', ['js', 'css', 'vendors'], callback);
});

// watch
gulp.task('watch', ['css:main', 'js:validate'], function() {
	cfg.watch = true;
	livereload.listen();
	gulp.watch(cfg.paths.less.main.watch, {interval: cfg.watchInterval}, ['css:main']);
	gulp.watch(cfg.paths.globjs, {interval: cfg.watchInterval}, ['js:validate']);
});

// aliases
gulp.task('lint', ['js:eslint']);
gulp.task('build', ['rainloop']);

gulp.task('all', function(callback) {
	runSequence('rainloop', 'owncloud', callback);
});

gulp.task('d', ['default']);
gulp.task('w', ['watch']);
gulp.task('l', ['js:libs']);
gulp.task('v', ['js:validate']);

gulp.task('b', ['build']);
gulp.task('o', ['owncloud']);

gulp.task('p', ['plugins:build']);
