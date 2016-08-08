/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
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

		paths: {},
		uglify: {
			mangle: true,
			compress: true
		}
	},

	_ = require('lodash'),
	fs = require('node-fs'),
	path = require('path'),
	notifier = require('node-notifier'),

	webpack = require('webpack'),
	webpackCfg = require('./webpack.config.js'),

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
	gutil = require('gulp-util')
;

// webpack
if (webpackCfg && webpackCfg.output)
{
	webpackCfg.output.publicPath = cfg.paths.staticJS;
}

if (webpackCfg && webpackCfg.plugins)
{
	webpackCfg.plugins.push(new webpack.DefinePlugin({
		'RL_COMMUNITY': !!cfg.community,
		'process.env': {
			NODE_ENV: '"production"'
		}
	}));
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

function regOtherMinTask(sName, sPath, sInc, sOut, sHeader)
{
	gulp.task(sName, function() {
		return gulp.src(sPath + sInc)
			.pipe(uglify())
			.pipe(header(sHeader || ''))
			.pipe(rename(sOut))
			.pipe(eol('\n', true))
			.pipe(gulp.dest(sPath));
	});
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

function renameFileWithMd5Hash(sFile, callback)
{
	var sHash = require('crypto').createHash('md5').update(fs.readFileSync(sFile)).digest('hex');
	cfg.lastMd5File = sFile.replace(/\.zip$/, '-' + sHash + '.zip');
	fs.renameSync(sFile, cfg.lastMd5File);
	callback();
}

function copyFile(sFile, sNewFile, callback)
{
	fs.writeFileSync(sNewFile, fs.readFileSync(sFile));
	callback();
}

cfg.paths.globjs = 'dev/**/*.{js,jsx,html,css}';
cfg.paths.globjsonly = 'dev/**/*.js';
cfg.paths.globjsxonly = 'dev/**/*.jsx';
cfg.paths.globjsall = 'dev/**/*.{js,jsx}';
cfg.paths.globtsonly = 'dev/**/*.ts';
cfg.paths.static = 'rainloop/v/' + cfg.devVersion + '/static/';
cfg.paths.staticJS = 'rainloop/v/' + cfg.devVersion + '/static/js/';
cfg.paths.staticMinJS = 'rainloop/v/' + cfg.devVersion + '/static/js/min/';
cfg.paths.staticCSS = 'rainloop/v/' + cfg.devVersion + '/static/css/';
cfg.paths.momentLocales = 'rainloop/v/' + cfg.devVersion + '/app/localization/moment/';

cfg.paths.less = {
	main: {
		name: 'less.css',
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
			'node_modules/lightgallery/dist/css/lightgallery.min.css',
			'node_modules/lightgallery/dist/css/lg-transitions.min.css',
			'node_modules/Progress.js/minified/progressjs.min.css',
			'dev/Styles/_progressjs.css',
			cfg.paths.staticCSS + cfg.paths.less.main.name
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
	openpgp: {
		name: 'openpgp.min.js',
		src: [
			'node_modules/openpgp/dist/openpgp.min.js'
		]
	},
	openpgpworker: {
		name: 'openpgp.worker.min.js',
		src: [
			'node_modules/openpgp/dist/openpgp.worker.min.js'
		]
	},
	moment: {
		locales: [
			'node_modules/moment/locale/*.js'
		]
	},
	libs: {
		name: 'libs.js',
		src: [
			'node_modules/jquery/dist/jquery.min.js',
			'node_modules/jquery-mousewheel/jquery.mousewheel.js',
			'node_modules/jquery-scrollstop/jquery.scrollstop.js',
			'node_modules/jquery-lazyload/jquery.lazyload.js ',
			'node_modules/jquery.backstretch/jquery.backstretch.min.js',
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
			'node_modules/tinycon/tinycon.min.js',
			'node_modules/knockout/build/output/knockout-latest.js',
			'node_modules/knockout-projections/dist/knockout-projections.min.js',
			'node_modules/knockout-sortable/build/knockout-sortable.min.js ',
			'node_modules/matchmedia-polyfill/matchMedia.js',
			'node_modules/matchmedia-polyfill/matchMedia.addListener.js',
			'node_modules/simplestatemanager/dist/ssm.min.js',
			'node_modules/autolinker/dist/Autolinker.min.js',
			'node_modules/opentip/lib/opentip.js',
			'node_modules/opentip/lib/adapter-jquery.js',
			'node_modules/lightgallery/dist/js/lightgallery.min.js',
			'node_modules/lightgallery/dist/js/lg-fullscreen.min.js',
			'node_modules/lightgallery/dist/js/lg-thumbnail.min.js',
			'node_modules/lightgallery/dist/js/lg-zoom.min.js',
			'node_modules/lightgallery/dist/js/lg-autoplay.min.js',
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

// CSS
gulp.task('less:main', function() {
	var less = require('gulp-less');

	return gulp.src(cfg.paths.less.main.src)
		.pipe(gulpif(cfg.watch, plumber({errorHandler: notify.onError("Error: <%= error.message %>")})))
		.pipe(less({
			'paths': cfg.paths.less.main.options.paths
		}))
		.pipe(rename(cfg.paths.less.main.name))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS))
		.on('error', gutil.log);
});

gulp.task('css:social', function() {
	var autoprefixer = require('gulp-autoprefixer');
	return gulp.src(cfg.paths.css.social.src)
		.pipe(concat(cfg.paths.css.social.name))
		.pipe(autoprefixer('last 3 versions', '> 1%', 'ie 9', 'Firefox ESR', 'Opera 12.1'))
		.pipe(replace(/\.\.\/(img|images|fonts|svg)\//g, '$1/'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

gulp.task('css:main-begin', ['less:main', 'css:social'], function() {
	var autoprefixer = require('gulp-autoprefixer');
	return gulp.src(cfg.paths.css.main.src)
		.pipe(concat(cfg.paths.css.main.name))
		.pipe(autoprefixer('last 3 versions', '> 1%', 'ie 9', 'Firefox ESR', 'Opera 12.1'))
		.pipe(replace(/\.\.\/(img|images|fonts|svg)\//g, '$1/'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS))
		.pipe(livereload());
});

gulp.task('package:community-on', function() {
	cfg.community = true;
	return true;
});

gulp.task('package:community-off', function() {
	cfg.community = false;
	return true;
});

gulp.task('css:clear-less', ['css:main-begin'], function() {
	return gulp.src(cfg.paths.staticCSS + cfg.paths.less.main.name, {read: false})
		.pipe(require('gulp-rimraf')());
});

gulp.task('css:main', ['css:clear-less']);

gulp.task('css:main:min', ['css:main'], function() {
	var cleanCSS = require('gulp-clean-css');
	return gulp.src(cfg.paths.staticCSS + cfg.paths.css.main.name)
		.pipe(cleanCSS())
		.pipe(rename({suffix: '.min'}))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

gulp.task('css:social:min', ['css:social'], function() {
	var cleanCSS = require('gulp-clean-css');
	return gulp.src(cfg.paths.staticCSS + cfg.paths.css.social.name)
		.pipe(cleanCSS())
		.pipe(rename({suffix: '.min'}))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

gulp.task('css:min', ['css:main:min', 'css:social:min']);

// JS
gulp.task('js:openpgp', function() {
	return gulp.src(cfg.paths.js.openpgp.src)
		.pipe(rename(cfg.paths.js.openpgp.name))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticMinJS));
});

gulp.task('js:openpgpworker', function() {
	return gulp.src(cfg.paths.js.openpgpworker.src)
		.pipe(rename(cfg.paths.js.openpgpworker.name))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticMinJS));
});

gulp.task('js:moment:locales-clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/app/localization/moment/*.js');
});

gulp.task('js:moment:locales', ['js:moment:locales-clear'], function() {
	return gulp.src(cfg.paths.js.moment.locales)
		.pipe(gulp.dest(cfg.paths.momentLocales));
});

gulp.task('js:libs', function() {
	return gulp.src(cfg.paths.js.libs.src)
		.pipe(concat(cfg.paths.js.libs.name, {separator: '\n\n'}))
		.pipe(eol('\n', true))
		.pipe(replace(/sourceMappingURL=[a-z0-9\.\-_]{1,20}\.map/ig, ''))
		.pipe(gulp.dest(cfg.paths.staticJS));
});

gulp.task('js:ckeditor:beautify', function() {
	var beautify = require('gulp-beautify');
	return gulp.src(cfg.paths.static + 'ckeditor/ckeditor.js')
		.pipe(beautify({
			'indentSize': 2
		}))
		.pipe(rename('ckeditor.beautify.js'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.static + 'ckeditor/'));
});

gulp.task('js:webpack', function(callback) {
	webpack(webpackCfg, function(err, stats) {

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
    });
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
gulp.task('js:min', ['js:app', 'js:admin', 'js:validate'], function() {
	return gulp.src(cfg.paths.staticJS + '*.js')
		.pipe(replace(/"rainloop\/v\/([^\/]+)\/static\/js\/"/g, '"rainloop/v/$1/static/js/min/"'))
		.pipe(uglify(cfg.uglify))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticMinJS))
		.on('error', gutil.log);
});

// lint
gulp.task('js:eslint', function() {
	return gulp.src(cfg.paths.globjsall)
		.pipe(cache('eslint'))
		.pipe(eslint())
		.pipe(gulpif(cfg.watch, plumber({errorHandler: notify.onError("Error: <%= error.message %>")})))
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

gulp.task('js:validate', ['js:eslint']);

// OTHER
gulp.task('lightgallery-fonts:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/css/fonts/lg.*');
});

gulp.task('fontastic-fonts:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/css/fonts/rainloop.*');
});

gulp.task('fontastic-svg:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/css/svg/*.svg');
});

gulp.task('lightgallery-fonts:copy', ['lightgallery-fonts:clear'], function() {
	return gulp.src('node_modules/lightgallery/dist/fonts/lg.*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/css/fonts'));
});

gulp.task('fontastic-fonts:copy', ['fontastic-fonts:clear'], function() {
	return gulp.src('vendors/fontastic/fonts/rainloop.*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/css/fonts'));
});

gulp.task('fontastic-svg:copy', ['fontastic-svg:clear'], function() {
	return gulp.src('vendors/fontastic/svg/*.svg')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/css/svg'));
});

gulp.task('lightgallery', ['lightgallery-fonts:copy']);
gulp.task('fontastic', ['fontastic-fonts:copy', 'fontastic-svg:copy']);

gulp.task('ckeditor:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/ckeditor');
});

gulp.task('ckeditor:copy', ['ckeditor:clear'], function() {
	return gulp.src(['vendors/ckeditor/**/*', 'vendors/ckeditor/.gitempty', '!vendors/ckeditor/samples{,/**}', '!vendors/ckeditor/adapters{,/**}', '!vendors/ckeditor/*.md'])
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/ckeditor'));
});

gulp.task('ckeditor:copy-plugins', ['ckeditor:copy'], function() {
	return gulp.src('vendors/ckeditor-plugins/**/*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/ckeditor/plugins'));
});

gulp.task('ckeditor', ['ckeditor:copy-plugins'], function () {
	return gulp.src('rainloop/v/' + cfg.devVersion + '/static/ckeditor/*.js')
		.pipe(stripbom())
		.pipe(header("\uFEFF")) // BOM
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/ckeditor'));
});

// BUILD (RainLoop)
gulp.task('rainloop:copy', ['default'], function() {

	var
		versionFull = pkg.version + '.' + parseInt(pkg.release, 10),
		dist = cfg.releasesPath + '/webmail/' + versionFull + '/src/'
	;

	fs.mkdirSync(dist, '0777', true);
	fs.mkdirSync(dist + 'data');
	fs.mkdirSync(dist + 'rainloop/v/' + versionFull, '0777', true);

	return gulp.src('rainloop/v/' + cfg.devVersion + '/**/*', {base: 'rainloop/v/' + cfg.devVersion})
		.pipe(gulp.dest(dist + 'rainloop/v/' + versionFull));
});

gulp.task('rainloop:setup', ['rainloop:copy'], function() {

	var
		versionFull = pkg.version + '.' + parseInt(pkg.release, 10),
		dist = cfg.releasesPath + '/webmail/' + versionFull + '/src/'
	;

	fs.writeFileSync(dist + 'data/VERSION', versionFull);
	fs.writeFileSync(dist + 'data/EMPTY', versionFull);

	fs.writeFileSync(dist + 'index.php',
		fs.readFileSync('index.php', 'utf8').replace('\'APP_VERSION\', \'0.0.0\'', '\'APP_VERSION\', \'' + versionFull + '\''));

	fs.writeFileSync(dist + 'rainloop/v/' + versionFull + '/index.php.root', fs.readFileSync(dist + 'index.php'));

	if (cfg.community)
	{
		require('rimraf').sync(dist + 'rainloop/v/' + versionFull + '/app/libraries/RainLoop/Prem/');
	}

	cfg.destPath = cfg.releasesPath + '/webmail/' + versionFull + '/';
	cfg.cleanPath = dist;
	cfg.zipSrcPath = dist;
	cfg.zipFile = 'rainloop-' + (cfg.community ? 'community-' : '') + versionFull + '.zip';
	cfg.md5File = cfg.zipFile;
	cfg.lastMd5File = '';

	cfg.rainloopBuilded = true;
});

gulp.task('rainloop:zip', ['rainloop:copy', 'rainloop:setup'], function() {
	return (cfg.destPath && cfg.zipSrcPath && cfg.zipFile) ?
		zipDir(cfg.zipSrcPath, cfg.destPath, cfg.zipFile) : false;
});

gulp.task('rainloop:md5', ['rainloop:zip'], function(callback) {
	renameFileWithMd5Hash(cfg.destPath + cfg.md5File, callback);
});

gulp.task('rainloop:clean', ['rainloop:copy', 'rainloop:setup', 'rainloop:zip'], function() {
	return (cfg.cleanPath) ? cleanDir(cfg.cleanPath) : false;
});

gulp.task('rainloop:shortname', ['rainloop:md5'], function(callback) {
	copyFile(cfg.lastMd5File, cfg.destPath +
		'rainloop' + (cfg.community ? '-community' : '') + '-latest.zip', callback);
});

// BUILD (OwnCloud)
gulp.task('rainloop:owncloud:copy', function() {

	var
		versionFull = pkg.ownCloudPackageVersion,
		dist = cfg.releasesPath + '/owncloud/' + versionFull + '/src/'
	;

	fs.mkdirSync(dist, '0777', true);
	fs.mkdirSync(dist + 'rainloop', '0777', true);

	return gulp.src('build/owncloud/rainloop-app/**/*', {base: 'build/owncloud/rainloop-app/'})
		.pipe(gulp.dest(dist + 'rainloop'));
});

gulp.task('rainloop:owncloud:copy-rainloop', ['rainloop:start', 'rainloop:owncloud:copy'], function() {

	var
		versionFull = pkg.ownCloudPackageVersion,
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

gulp.task('rainloop:owncloud:setup', ['rainloop:owncloud:copy',
	'rainloop:owncloud:copy-rainloop'], function() {

	var
		versionFull = pkg.ownCloudPackageVersion,
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
	cfg.md5File = cfg.zipFile;

});

gulp.task('rainloop:owncloud:zip', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup'], function() {
	return (cfg.destPath && cfg.zipSrcPath && cfg.zipFile) ?
		zipDir(cfg.zipSrcPath, cfg.destPath, cfg.zipFile) : false;
});

gulp.task('rainloop:owncloud:md5', ['rainloop:owncloud:zip'], function(callback) {
	renameFileWithMd5Hash(cfg.destPath +  cfg.md5File, callback);
});

gulp.task('rainloop:owncloud:clean', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup', 'rainloop:owncloud:zip'], function() {
	return (cfg.cleanPath) ? cleanDir(cfg.cleanPath) : false;
});

gulp.task('rainloop:owncloud:shortname', ['rainloop:owncloud:md5'], function(callback) {
	copyFile(cfg.lastMd5File, cfg.destPath +
		'rainloop' + (cfg.community ? '' : '-standard') + '.zip', callback);
});

// MAIN
gulp.task('js:pgp', ['js:openpgp', 'js:openpgpworker']);
gulp.task('js:moment', ['js:moment:locales']);

gulp.task('default', ['js:libs', 'js:pgp', 'js:moment', 'js:min', 'css:min', 'ckeditor', 'fontastic', 'lightgallery']);
gulp.task('default+', ['package:community-off', 'default']);
gulp.task('fast-', ['js:app', 'js:admin', 'css:main']);

gulp.task('fast', ['package:community-on', 'fast-']);
gulp.task('fast+', ['package:community-off', 'fast-']);

gulp.task('rainloop:start', ['rainloop:copy', 'rainloop:setup']);

gulp.task('rainloop-', ['rainloop:start', 'rainloop:zip', 'rainloop:md5', 'rainloop:clean', 'rainloop:shortname']);

gulp.task('rainloop', ['package:community-on', 'rainloop-']);
gulp.task('rainloop+', ['package:community-off', 'rainloop-']);

gulp.task('owncloud-', ['rainloop:owncloud:copy',
	'rainloop:owncloud:copy-rainloop', 'rainloop:owncloud:copy-rainloop:clean',
	'rainloop:owncloud:setup', 'rainloop:owncloud:zip', 'rainloop:owncloud:md5', 'rainloop:owncloud:clean', 'rainloop:owncloud:shortname']);

gulp.task('owncloud', ['package:community-on', 'owncloud-']);
gulp.task('owncloud+', ['package:community-off', 'owncloud-']);

//WATCH
gulp.task('watch', ['fast'], function() {
	cfg.watch = true;
	livereload.listen();
	gulp.watch(cfg.paths.globjs, {interval: cfg.watchInterval}, ['js:app', 'js:admin']);
	gulp.watch(cfg.paths.globjsall, {interval: cfg.watchInterval}, ['js:validate']);
	gulp.watch(cfg.paths.less.main.watch, {interval: cfg.watchInterval}, ['css:main']);
});

gulp.task('watch+', ['fast+'], function() {
	cfg.watch = true;
	livereload.listen();
	gulp.watch(cfg.paths.globjs, {interval: cfg.watchInterval}, ['js:app', 'js:admin']);
	gulp.watch(cfg.paths.globjsall, {interval: cfg.watchInterval}, ['js:validate']);
	gulp.watch(cfg.paths.less.main.watch, {interval: cfg.watchInterval}, ['css:main']);
});

// ALIASES
gulp.task('build', ['rainloop']);
gulp.task('build+', ['rainloop+']);

gulp.task('js:v', ['js:validate']);
gulp.task('v', ['js:v']);

gulp.task('d', ['default']);
gulp.task('d+', ['default+']);
gulp.task('w', ['watch']);
gulp.task('w+', ['watch+']);
gulp.task('f', ['fast']);
gulp.task('f+', ['fast+']);

gulp.task('b', ['build']);
gulp.task('b+', ['build+']);

gulp.task('o', ['owncloud']);
gulp.task('o+', ['owncloud+']);
