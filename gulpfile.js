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
		summary: {
			verbose: true,
			reasonCol: 'cyan,bold',
			codeCol: 'green'
		},
		uglify: {
			mangle: true,
			compress: true
		}
	},

	_ = require('lodash'),
	fs = require('node-fs'),
	path = require('path'),
	notifier = require('node-notifier'),

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
	gutil = require('gulp-util')
;

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

cfg.paths.globjs = 'dev/**/*.js';
cfg.paths.static = 'rainloop/v/' + cfg.devVersion + '/static/';
cfg.paths.staticJS = 'rainloop/v/' + cfg.devVersion + '/static/js/';
cfg.paths.staticMinJS = 'rainloop/v/' + cfg.devVersion + '/static/js/min/';
cfg.paths.staticCSS = 'rainloop/v/' + cfg.devVersion + '/static/css/';

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
			'vendors/jquery-ui/css/smoothness/jquery-ui-1.10.3.custom.css',
			'vendors/normalize/normalize.css',
			'vendors/fontastic/styles.css',
			'vendors/jquery-nanoscroller/nanoscroller.css',
			'vendors/jquery-letterfx/jquery-letterfx.min.css',
			'vendors/progress.js/minified/progressjs.min.css',
			'vendors/progress.js/minified/progressjs.rainloop.css',
			'vendors/inputosaurus/inputosaurus.css',
			'vendors/opentip/opentip.css',
			'vendors/flags/flags-fixed.css',
			'vendors/lightGallery/dist/css/lightgallery.min.css',
			'vendors/lightGallery/dist/css/lg-transitions-lg-lollipop.css',
			cfg.paths.staticCSS + cfg.paths.less.main.name
		]
	}
};

cfg.paths.js = {
	boot: {
		name: 'boot.js',
		src: [
			'vendors/json2.min.js',
			'vendors/labjs/LAB.min.js',
			'vendors/modernizr.js',
			'vendors/progress.js/minified/progress.min.js',
			'vendors/rl/rl-1.5.min.js'
		]
	},
	openpgp: {
		name: 'openpgp.min.js',
		src: [
			'vendors/openpgp/openpgp-1.2.0.min.js'
		]
	},
	openpgpworker: {
		name: 'openpgp.worker.min.js',
		src: [
			'vendors/openpgp/openpgp-1.2.0.worker.min.js'
		]
	},
	encrypt: {
		name: 'bundle.js',
		header: '(function (window) {',
		footer: '}(window));',
		dest: 'vendors/jsbn/',
		src: [
			'vendors/jsbn/jsbn.js',
			'vendors/jsbn/prng4.js',
			'vendors/jsbn/rng.js',
			'vendors/jsbn/rsa.js',
			'vendors/jsbn/fix.js'
		]
	},
	libs: {
		name: 'libs.js',
		src: [
			'vendors/underscore/1.6.0/underscore-min.js',
			'vendors/jquery/jquery-1.11.3.min.js',
			'vendors/jquery-ui/js/jquery-ui-1.10.3.custom.min.js',
			'vendors/jquery-cookie/jquery.cookie-1.4.0.min.js',
			'vendors/jquery-finger/jquery.finger.min.js',
			'vendors/jquery-mousewheel/jquery.mousewheel-3.1.4.min.js',
			'vendors/jquery-scrollstop/jquery.scrollstop.min.js',
			'vendors/jquery-lazyload/jquery.lazyload.min.js',
			'vendors/jquery-nanoscroller/jquery.nanoscroller-0.7.min.js',
			'vendors/jquery-wakeup/jquery.wakeup.min.js',
			'vendors/jquery-letterfx/jquery-letterfx.min.js',
			'vendors/jquery-backstretch/jquery.backstretch.min.js',
			'vendors/queue/queue.min.js',
			'vendors/inputosaurus/inputosaurus.min.js',
			'vendors/moment/min/moment.min.js ',
			'vendors/tinycon/tinycon.min.js ',
			'vendors/routes/signals.min.js',
			'vendors/routes/hasher.min.js',
			'vendors/routes/crossroads.min.js',
			'vendors/knockout/knockout-3.3.0.js',
			'vendors/knockout-projections/knockout-projections-1.0.0.min.js',
			'vendors/knockout-sortable/knockout-sortable.min.js',
			'vendors/ssm/ssm.min.js',
			'vendors/jua/jua.min.js',
			'vendors/Q/q.min.js',
			'vendors/opentip/opentip-jquery.min.js',
			'vendors/Autolinker/Autolinker.min.js',
			'vendors/lightGallery/dist/js/lightgallery.min.js',
			'vendors/lightGallery/dist/js/lg-fullscreen.min.js',
			'vendors/lightGallery/dist/js/lg-thumbnail.min.js',
			'vendors/lightGallery/dist/js/lg-zoom.min.js',
			'vendors/lightGallery/dist/js/lg-autoplay.min.js',
			'vendors/keymaster/keymaster.min.js',
			'vendors/ifvisible/ifvisible.min.js',
			'vendors/bootstrap/js/bootstrap.min.js'
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
		.on('error', gutil.log)
	;
});

gulp.task('css:main-begin', ['less:main'], function() {

	var
//		csslint = require('gulp-csslint'),
//		csscomb = require('gulp-csscomb'),
		autoprefixer = require('gulp-autoprefixer')
	;

	return gulp.src(cfg.paths.css.main.src)
		.pipe(concat(cfg.paths.css.main.name))
		.pipe(autoprefixer('last 3 versions', '> 1%', 'ie 9', 'Firefox ESR', 'Opera 12.1'))
		.pipe(replace(/\.\.\/(img|images|fonts|svg)\//g, '$1/'))
//		.pipe(csscomb())
//		.pipe(csslint())
//		.pipe(csslint.reporter())
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS))
		.pipe(livereload())
	;
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
	var minifyCss = require('gulp-minify-css');
	return gulp.src(cfg.paths.staticCSS + cfg.paths.css.main.name)
		.pipe(minifyCss({
			'keepSpecialComments': 0
		}))
		.pipe(rename({suffix: '.min'}))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

// JS
gulp.task('js:boot', function() {
	return gulp.src(cfg.paths.js.boot.src)
		.pipe(concat(cfg.paths.js.boot.name))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticMinJS));
});

gulp.task('js:encrypt', function() {
	return gulp.src(cfg.paths.js.encrypt.src)
		.pipe(concat(cfg.paths.js.encrypt.name))
		.pipe(concat.header(cfg.paths.js.encrypt.header || ''))
		.pipe(concat.footer(cfg.paths.js.encrypt.footer || ''))
		.pipe(uglify(cfg.uglify))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.js.encrypt.dest))
		.on('error', gutil.log);
});

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

gulp.task('js:libs', function() {
	return gulp.src(cfg.paths.js.libs.src)
		.pipe(concat(cfg.paths.js.libs.name, {separator: '\n\n'}))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticMinJS));
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

gulp.task('js:webpack:clear', function() {
	return gulp.src([cfg.paths.staticJS + '*.subapp.js', cfg.paths.staticMinJS + '*.subapp.js'], {read: false})
		.pipe(require('gulp-rimraf')());
});

gulp.task('js:webpack', [/*'js:webpack:clear'*/], function(callback) {

	var
		webpack = require('webpack'),
		webpackCfg = require('./webpack.config.js')
	;

	if (webpackCfg && webpackCfg.output)
	{
		webpackCfg.output.publicPath = cfg.paths.staticJS;
	}

	if (webpackCfg && webpackCfg.plugins)
	{
		webpackCfg.plugins.push(new webpack.DefinePlugin({
            'RL_COMMUNITY': !!cfg.community
        }));
	}

	webpack(webpackCfg, function(err, stats) {

		var
			fN = function (err) {
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
		;

        if (err)
		{
			if (cfg.watch)
			{
				fN(err);
			}
			else
			{
				throw new gutil.PluginError('webpack', err);
			}
		}
		else if (stats && stats.compilation && stats.compilation.errors &&
			stats.compilation.errors[0])
		{
			if (cfg.watch)
			{
				_.each(stats.compilation.errors, function (err) {
					fN(err);
				});
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

gulp.task('js:chunks', ['js:webpack'], function() {
	return gulp.src(cfg.paths.staticJS + '*.subapp.js')
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

// - min
gulp.task('js:min', ['js:app', 'js:admin', 'js:chunks'], function() {
	return gulp.src(cfg.paths.staticJS + '*.js')
		.pipe(replace(/"rainloop\/v\/([^\/]+)\/static\/js\/"/g, '"rainloop/v/$1/static/js/min/"'))
		.pipe(uglify(cfg.uglify))
		.pipe(header(getHead() + '\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticMinJS))
		.on('error', gutil.log);
});

// lint
gulp.task('js:lint', function() {

	var
		closureCompiler = require('gulp-closure-compiler'),
		jshint = require('gulp-jshint')
	;

	return gulp.src(cfg.paths.globjs)
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-summary', cfg.summary))
		.pipe(jshint.reporter('fail'))
		// google compiler
		.pipe(gulpif(cfg.googleCompile, closureCompiler({
			compilerPath: './build/compiler.jar',
			fileName: 'gc.js',
			compilerFlags: {
				output_wrapper: '(function(){%output%}());'
			}
		})))
	;
});

// OTHER
regOtherMinTask('other:cookie', 'vendors/jquery-cookie/', 'jquery.cookie.js', 'jquery.cookie-1.4.0.min.js',
	'/*! jquery.cookie v1.4.0 (c) 2013 Klaus Hartl | MIT */\n');

regOtherMinTask('other:ifvisible', 'vendors/ifvisible/', 'src/ifvisible.js', 'ifvisible.min.js',
	'/*!ifvisible.js v1.0.0 (c) 2013 Serkan Yersen | MIT */\n');

regOtherMinTask('other:keymaster', 'vendors/keymaster/', 'keymaster.js', 'keymaster.min.js',
	'/*!keymaster.js (c) 2011-2013 Thomas Fuchs | MIT */\n');

regOtherMinTask('other:wakeup', 'vendors/jquery-wakeup/', 'jquery.wakeup.js', 'jquery.wakeup.min.js',
	'/*! jQuery WakeUp plugin (c) 2013 Paul Okopny <paul.okopny@gmail.com> | MIT */\n');

regOtherMinTask('other:mousewheel', 'vendors/jquery-mousewheel/', 'jquery.mousewheel.js', 'jquery.mousewheel-3.1.4.min.js',
	'/*! jquery.mousewheel v3.1.4 (c) 2013 Brandon Aaron (http://brandon.aaron.sh) | MIT */\n');

regOtherMinTask('other:nano', 'vendors/jquery-nanoscroller/', 'jquery.nanoscroller.js', 'jquery.nanoscroller-0.7.min.js',
	'/*! nanoScrollerJS v0.7 (c) 2013 James Florentino; modified by RainLoop Team | MIT */\n');

regOtherMinTask('other:inputosaurus', 'vendors/inputosaurus/', 'inputosaurus.js', 'inputosaurus.min.js',
	'/*! Inputosaurus Text v0.1.6 (c) 2013 Dan Kielp <dan@sproutsocial.com>; modified by RainLoop Team | MIT */\n');

regOtherMinTask('other:pace', 'vendors/simple-pace/', 'simple-pace.js', 'simple-pace-1.0.min.js',
	'/*! RainLoop Simple Pace v1.0 (c) 2014 RainLoop Team; Licensed under MIT */\n');

regOtherMinTask('other:rl', 'vendors/rl/', 'rl.js', 'rl-1.5.min.js',
	'/*! RainLoop Index Helper v1.5 (c) 2015 RainLoop Team; Licensed under MIT */\n');

regOtherMinTask('other:q', 'vendors/Q/', 'q.js', 'q.min.js',
	'/*! (c) 2009-2012 Kris Kowal Licensed under MIT */\n');

gulp.task('fontastic-fonts:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/css/fonts/rainloop.*');
});

gulp.task('fontastic-svg:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/css/svg/*.svg');
});

gulp.task('fontastic-fonts:copy', ['fontastic-fonts:clear'], function() {
	return gulp.src('vendors/fontastic/fonts/rainloop.*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/css/fonts'));
});

gulp.task('fontastic-svg:copy', ['fontastic-svg:clear'], function() {
	return gulp.src('vendors/fontastic/svg/*.svg')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/css/svg'));
});

gulp.task('fontastic', ['fontastic-fonts:copy', 'fontastic-svg:copy']);

gulp.task('ckeditor:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/ckeditor');
});

gulp.task('ckeditor:copy', ['ckeditor:clear'], function() {
	return gulp.src('vendors/ckeditor/**/*')
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
gulp.task('default', ['js:libs', 'js:boot', 'js:openpgp', 'js:openpgpworker', 'js:min', 'css:main:min', 'ckeditor', 'fontastic']);
gulp.task('fast-', ['js:app', 'js:admin', 'js:chunks', 'css:main']);

gulp.task('fast', ['package:community-on', 'fast-']);
gulp.task('fast+', ['package:community-off', 'fast-']);

gulp.task('rainloop:start', ['js:lint', 'rainloop:copy', 'rainloop:setup']);

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
	gulp.watch(cfg.paths.less.main.watch, {interval: cfg.watchInterval}, ['css:main']);
});

gulp.task('watch+', ['fast+'], function() {
	cfg.watch = true;
	livereload.listen();
	gulp.watch(cfg.paths.globjs, {interval: cfg.watchInterval}, ['js:app', 'js:admin']);
	gulp.watch(cfg.paths.less.main.watch, {interval: cfg.watchInterval}, ['css:main']);
});

// ALIASES
gulp.task('build', ['rainloop']);
gulp.task('build+', ['rainloop+']);
gulp.task('js:hint', ['js:lint']);

gulp.task('w', ['watch']);
gulp.task('w+', ['watch+']);
gulp.task('f', ['fast']);
gulp.task('f+', ['fast+']);

gulp.task('b', ['build']);
gulp.task('b+', ['build+']);

gulp.task('o', ['owncloud']);
gulp.task('o+', ['owncloud+']);

gulp.task('h', ['js:lint']);
gulp.task('l', ['js:lint']);
