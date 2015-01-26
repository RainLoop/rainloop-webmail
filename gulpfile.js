/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

var
	pkg = require('./package.json'),
	cfg = {
		devVersion: '0.0.0',
		releasesPath: 'build/dist/releases',

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

	fs = require('node-fs'),
	path = require('path'),
	gulp = require('gulp'),
	concat = require('gulp-concat-util'),
	header = require('gulp-header'),
	eol = require('gulp-eol'),
	stripbom = require('gulp-stripbom'),
	rename = require('gulp-rename'),
	replace = require('gulp-replace'),
	uglify = require('gulp-uglify'),
	plumber = require('gulp-plumber'),
	gutil = require('gulp-util')
;

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

function renameFileWothMd5Hash(sFile)
{
	var sHash = require('crypto').createHash('md5').update(fs.readFileSync(sFile)).digest('hex');
	fs.renameSync(sFile, sFile.replace(/\.zip$/, '-' + sHash + '.zip'));
	return true;
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
			paths: [path.join(__dirname, 'dev/Styles/'), path.join(__dirname, 'vendors/bootstrap/less/')]
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
			'vendors/simple-pace/styles.css',
			'vendors/inputosaurus/inputosaurus.css',
			'vendors/photoswipe/photoswipe.css',
			'vendors/photoswipe/default-skin/default-skin.css',
			'vendors/flags/flags-fixed.css',
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
			'vendors/simple-pace/simple-pace-1.0.min.js',
			'vendors/rl/rl-1.4.min.js'
		]
	},
	openpgp: {
		name: 'openpgp.js',
		src: [
			'vendors/openpgp/openpgp-0.7.2.min.js'
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
			'vendors/modernizr.js',
			'vendors/underscore/1.6.0/underscore-min.js',
			'vendors/jquery/jquery-1.11.2.min.js',
			'vendors/jquery-ui/js/jquery-ui-1.10.3.custom.min.js',
//			'vendors/jquery-ui.touch-punch/jquery.ui.touch-punch.min.js',
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
			'vendors/routes/signals.min.js',
			'vendors/routes/hasher.min.js',
			'vendors/routes/crossroads.min.js',
			'vendors/knockout/knockout-3.2.0.js',
//			'vendors/knockout-punches/knockout.punches.min.js',
			'vendors/knockout-projections/knockout-projections-1.0.0.min.js',
			'vendors/knockout-sortable/knockout-sortable.min.js',
			'vendors/ssm/ssm.min.js',
			'vendors/jua/jua.min.js',
			'vendors/buzz/buzz.min.js',
			'vendors/Autolinker/Autolinker.min.js',
			'vendors/photoswipe/photoswipe.min.js',
			'vendors/photoswipe/photoswipe-ui-default.min.js',
//			'vendors/jsencrypt/jsencrypt.min.js',
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
		.pipe(less({
			'paths': cfg.paths.less.main.options.paths
		}))
		.pipe(rename(cfg.paths.less.main.name))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS))
		.on('error', gutil.log);
});

gulp.task('css:main-begin', ['less:main'], function() {

	var
//		csslint = require('gulp-csslint'),
//		csscomb = require('gulp-csscomb'),
		autoprefixer = require('gulp-autoprefixer')
	;

	return gulp.src(cfg.paths.css.main.src)
		.pipe(plumber())
		.pipe(concat(cfg.paths.css.main.name))
		.pipe(autoprefixer('last 3 versions', '> 1%', 'ie 9', 'Firefox ESR', 'Opera 12.1'))
//		.pipe(csscomb())
//		.pipe(csslint())
//		.pipe(csslint.reporter())
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticCSS))
	;
});

gulp.task('css:clear-less', ['css:main-begin'], function() {

	return gulp.src(cfg.paths.staticCSS + cfg.paths.less.main.name, {read: false})
		.pipe(require('gulp-rimraf')());
});

gulp.task('css:main', ['css:clear-less']);

gulp.task('css:main:min', ['css:main'], function() {
	var minifyCss = require('gulp-minify-css');
	return gulp.src(cfg.paths.staticCSS + cfg.paths.css.main.name)
		.pipe(plumber())
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

gulp.task('js:webpack', ['js:webpack:clear'], function(callback) {
	var
		webpack = require('webpack'),
		webpackCfg = require('./webpack.config.js')
	;

	if (webpackCfg && webpackCfg.output)
	{
		webpackCfg.output.publicPath = cfg.paths.staticJS;
	}

	webpack(webpackCfg, function(err, stats) {
        if (err) {
			throw new gutil.PluginError('webpack', err);
		}
		gutil.log('[webpack]', stats.toString({}));
        callback();
    });
});

gulp.task('js:app', ['js:webpack'], function() {
	return gulp.src(cfg.paths.staticJS + cfg.paths.js.app.name)
		.pipe(header('/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

gulp.task('js:admin', ['js:webpack'], function() {
	return gulp.src(cfg.paths.staticJS + cfg.paths.js.admin.name)
		.pipe(header('/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

gulp.task('js:chunks', ['js:webpack'], function() {
	return gulp.src(cfg.paths.staticJS + '*.subapp.js')
		.pipe(header('/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */\n'))
		.pipe(eol('\n', true))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

// - min
gulp.task('js:min', ['js:app', 'js:admin', 'js:chunks'], function() {
	return gulp.src(cfg.paths.staticJS + '*.js')
		.pipe(replace(/"rainloop\/v\/([^\/]+)\/static\/js\/"/g, '"rainloop/v/$1/static/js/min/"'))
		.pipe(uglify(cfg.uglify))
		.pipe(header('/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */\n'))
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
		.pipe(closureCompiler({
			compilerPath: './build/compiler.jar',
			fileName: 'gc.js',
			compilerFlags: {
				output_wrapper: '(function(){%output%}());'
			}
		}));
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

regOtherMinTask('other:rl', 'vendors/rl/', 'rl.js', 'rl-1.4.min.js',
	'/*! RainLoop Index Helper v1.4 (c) 2014 RainLoop Team; Licensed under MIT */\n');

gulp.task('fontastic-fonts:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/css/fonts/rainloop.*');
});

gulp.task('fontastic-fonts:copy', ['fontastic-fonts:clear'], function() {
	return gulp.src('vendors/fontastic/fonts/rainloop.*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/css/fonts'));
});

gulp.task('fontastic', ['fontastic-fonts:copy']);

gulp.task('ckeditor:clear', function() {
	return cleanDir('rainloop/v/' + cfg.devVersion + '/static/ckeditor');
});

gulp.task('ckeditor:copy', ['ckeditor:clear'], function() {
	return gulp.src('vendors/ckeditor/**/*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/ckeditor'));
});

gulp.task('ckeditor:copy-plugins', ['ckeditor:copy'], function() {
	return true;
	return gulp.src('vendors/ckeditor-plugins/**/*')
		.pipe(gulp.dest('rainloop/v/' + cfg.devVersion + '/static/ckeditor/plugins'));
});

gulp.task('ckeditor', ['ckeditor:copy-plugins'], function () {
	return gulp.src('rainloop/v/' + cfg.devVersion + '/static/ckeditor/*.js')
		.pipe(stripbom())
//		.pipe(replace("\u200B", "\\u200B"))
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

	cfg.destPath = cfg.releasesPath + '/webmail/' + versionFull + '/';
	cfg.cleanPath = dist;
	cfg.zipSrcPath = dist;
	cfg.zipFile = 'rainloop-' + versionFull + '.zip';
	cfg.md5File = cfg.zipFile;
});

gulp.task('rainloop:zip', ['rainloop:copy', 'rainloop:setup'], function() {
	return (cfg.destPath && cfg.zipSrcPath && cfg.zipFile) ?
		zipDir(cfg.zipSrcPath, cfg.destPath, cfg.zipFile) : false;
});

gulp.task('rainloop:md5', ['rainloop:zip'], function() {
	return (cfg.destPath && cfg.md5File) ?
		renameFileWothMd5Hash(cfg.destPath +  cfg.md5File) : false;
});

gulp.task('rainloop:clean', ['rainloop:copy', 'rainloop:setup', 'rainloop:zip'], function() {
	return (cfg.cleanPath) ? cleanDir(cfg.cleanPath) : false;
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

gulp.task('rainloop:owncloud:setup', ['rainloop:owncloud:copy'], function() {

	var
		versionFull = pkg.ownCloudPackageVersion,
		dist = cfg.releasesPath + '/owncloud/' + versionFull + '/src/'
	;

	fs.writeFileSync(dist + 'rainloop/appinfo/info.xml',
		fs.readFileSync(dist + 'rainloop/appinfo/info.xml', 'utf8').replace('<version>0.0</version>', '<version>' + versionFull + '</version>'));

	fs.writeFileSync(dist + 'rainloop/appinfo/version', versionFull);
	fs.writeFileSync(dist + 'rainloop/VERSION', versionFull);

	cfg.destPath = cfg.releasesPath + '/owncloud/' + versionFull + '/';
	cfg.cleanPath = dist;
	cfg.zipSrcPath = dist;
	cfg.zipFile = 'rainloop-owncloud-app-' + versionFull + '.zip';
	cfg.md5File = cfg.zipFile;

});

gulp.task('rainloop:owncloud:zip', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup'], function() {
	return (cfg.destPath && cfg.zipSrcPath && cfg.zipFile) ?
		zipDir(cfg.zipSrcPath, cfg.destPath, cfg.zipFile) : false;
});

gulp.task('rainloop:owncloud:md5', ['rainloop:owncloud:zip'], function() {
	return (cfg.destPath && cfg.md5File) ?
		renameFileWothMd5Hash(cfg.destPath +  cfg.md5File) : false;
});

gulp.task('rainloop:owncloud:clean', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup', 'rainloop:owncloud:zip'], function() {
	return (cfg.cleanPath) ? cleanDir(cfg.cleanPath) : false;
});

// MAIN
gulp.task('default', ['js:libs', 'js:boot', 'js:openpgp', 'js:min', 'css:main:min', 'ckeditor', 'fontastic']);
gulp.task('fast', ['js:app', 'js:admin', 'js:chunks', 'css:main']);

gulp.task('rainloop', ['js:lint', 'rainloop:copy', 'rainloop:setup', 'rainloop:zip', 'rainloop:md5', 'rainloop:clean']);
gulp.task('owncloud', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup', 'rainloop:owncloud:zip', 'rainloop:owncloud:md5', 'rainloop:owncloud:clean']);

//WATCH
gulp.task('watch', ['fast'], function() {
	gulp.watch(cfg.paths.globjs, {interval: 500}, ['js:app', 'js:admin']);
	gulp.watch(cfg.paths.less.main.watch, {interval: 500}, ['css:main']);
});

// ALIASES
gulp.task('w', ['watch']);
gulp.task('f', ['fast']);

gulp.task('rl', ['rainloop']);
gulp.task('build', ['rainloop']);
gulp.task('b', ['build']);

gulp.task('own', ['owncloud']);
gulp.task('js:hint', ['js:lint']);