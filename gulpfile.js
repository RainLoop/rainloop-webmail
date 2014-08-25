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
			compress: true,
			preserveComments: 'some'
		}
	},

	browserify = require('browserify'),
	streamify = require('gulp-streamify'),
	source = require('vinyl-source-stream'),

	fs = require('node-fs'),
	path = require('path'),
	gulp = require('gulp'),
	concat = require('gulp-concat-util'),
	header = require('gulp-header'),
	footer = require('gulp-footer'),
	rename = require('gulp-rename'),
	minifyCss = require('gulp-minify-css'),
	less = require('gulp-less'),
	jshint = require('gulp-jshint'),
	uglify = require('gulp-uglify'),
	gutil = require('gulp-util')
;

function regOtherMinTask(sName, sPath, sInc, sOut, sHeader)
{
	gulp.task(sName, function() {
		return gulp.src(sPath + sInc)
			.pipe(uglify())
			.pipe(header(sHeader || ''))
			.pipe(rename(sOut))
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
cfg.paths.staticJS = 'rainloop/v/' + cfg.devVersion + '/static/js/';
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
		name_min: 'app.min.css',
		src: [
			'vendors/jquery-ui/css/smoothness/jquery-ui-1.10.3.custom.css',
			'vendors/normalize/normalize.css',
			'vendors/fontastic/styles.css',
			'vendors/jquery-nanoscroller/nanoscroller.css',
			'vendors/jquery-magnific-popup/magnific-popup.css',
			'vendors/jquery-magnific-popup/magnific-popup-animations.css',
			'vendors/simple-pace/styles.css',
			'vendors/inputosaurus/inputosaurus.css',
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
			'vendors/rl/rl-1.1.min.js'
		]
	},
	openpgp: {
		name: 'openpgp.min.js',
		src: [
			'vendors/openpgp/openpgp-0.7.2.min.js'
		]
	},
	encrypt: {
		name: '_encrypt.min.js',
		header: '(function (window) {',
		footer: '}(window));',
		dest: 'vendors/jsbn/',
		src: [
			'vendors/jsbn/jsbn.js',
			'vendors/jsbn/prng4.js',
			'vendors/jsbn/rng.js',
			'vendors/jsbn/rsa.js',
			'vendors/jsbn/_fix.js'
		]
	},
	libs: {
		name: 'libs.js',
		src: [
			'vendors/modernizr.js',
			'vendors/underscore/underscore-1.5.2.min.js',
			'vendors/jquery/jquery-1.11.1.min.js',
			'vendors/jquery-ui/js/jquery-ui-1.10.3.custom.min.js',
			'vendors/jquery-cookie/jquery.cookie-1.4.0.min.js',
			'vendors/jquery-finger/jquery.finger.min.js',
			'vendors/jquery-mousewheel/jquery.mousewheel-3.1.4.min.js',
			'vendors/jquery-scrollstop/jquery.scrollstop.min.js',
			'vendors/jquery-lazyload/jquery.lazyload.min.js',
			'vendors/jquery-nanoscroller/jquery.nanoscroller-0.7.min.js',
			'vendors/jquery-wakeup/jquery.wakeup.min.js',
			'vendors/jquery-linkify/jquery.linkify.min.js',
			'vendors/inputosaurus/inputosaurus.min.js',
			'vendors/moment/min/moment.min.js ',
			'vendors/routes/signals.min.js',
			'vendors/routes/hasher.min.js',
			'vendors/routes/crossroads.min.js',
			'vendors/knockout/knockout-3.2.0.js',
			'vendors/knockout-projections/knockout-projections-1.0.0.min.js',
			'vendors/ssm/ssm.min.js',
			'vendors/jua/jua.min.js',
			'vendors/jsbn/_encrypt.min.js',
			'vendors/keymaster/keymaster.js',
			'vendors/ifvisible/ifvisible.min.js',
			'vendors/jquery-magnific-popup/jquery.magnific-popup.min.js',
			'vendors/bootstrap/js/bootstrap.min.js'
		]
	},
	app: {
		name: 'app.js',
		name_min: 'app.min.js'
	},
	admin: {
		name: 'admin.js',
		name_min: 'admin.min.js'
	}
};

// CSS
gulp.task('less:main', function() {
	return gulp.src(cfg.paths.less.main.src)
		.pipe(less({
			'paths': cfg.paths.less.main.options.paths
		}))
		.pipe(rename(cfg.paths.less.main.name))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

gulp.task('css:main', ['less:main'], function() {
	return gulp.src(cfg.paths.css.main.src)
		.pipe(concat(cfg.paths.css.main.name))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

gulp.task('css:main:min', ['css:main'], function() {
	return gulp.src(cfg.paths.staticCSS + cfg.paths.css.main.name)
		.pipe(minifyCss())
		.pipe(rename(cfg.paths.css.main.name_min))
		.pipe(gulp.dest(cfg.paths.staticCSS));
});

// JS
// - concat
gulp.task('js:boot', function() {
	return gulp.src(cfg.paths.js.boot.src)
		.pipe(concat(cfg.paths.js.boot.name))
		.pipe(gulp.dest(cfg.paths.staticJS));
});

gulp.task('js:encrypt', function() {
	return gulp.src(cfg.paths.js.encrypt.src)
		.pipe(concat(cfg.paths.js.encrypt.name))
		.pipe(header(cfg.paths.js.encrypt.header || ''))
		.pipe(footer(cfg.paths.js.encrypt.footer || ''))
		.pipe(uglify(cfg.uglify))
		.pipe(gulp.dest(cfg.paths.js.encrypt.dest || cfg.paths.staticJS))
		.on('error', gutil.log);
});

gulp.task('js:openpgp', function() {
	return gulp.src(cfg.paths.js.openpgp.src)
		.pipe(rename(cfg.paths.js.openpgp.name))
		.pipe(gulp.dest(cfg.paths.staticJS));
});

gulp.task('js:libs', function() {
	return gulp.src(cfg.paths.js.libs.src)
		.pipe(concat(cfg.paths.js.libs.name, {separator: '\n\n'}))
		.pipe(gulp.dest(cfg.paths.staticJS));
});

gulp.task('js:app', function() {
    return browserify({
			'basedir': './dev/',
			'detectGlobals': false,
			'debug': false
		})
		.add('./_RainLoopBoot.js')
		.bundle()
        .pipe(source(cfg.paths.js.app.name))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

gulp.task('js:admin', function() {
    return browserify({
			'basedir': './dev/',
			'detectGlobals': false,
			'debug': false
		})
		.add('./_AdminBoot.js')
		.bundle()
        .pipe(source(cfg.paths.js.admin.name))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

// - min
gulp.task('js:app:min', ['js:app'], function() {
	return gulp.src(cfg.paths.staticJS + cfg.paths.js.app.name)
		.pipe(rename(cfg.paths.js.app.name_min))
		.pipe(uglify(cfg.uglify))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

gulp.task('js:admin:min', ['js:admin'], function() {
	return gulp.src(cfg.paths.staticJS + cfg.paths.js.admin.name)
		.pipe(rename(cfg.paths.js.admin.name_min))
		.pipe(uglify(cfg.uglify))
		.pipe(gulp.dest(cfg.paths.staticJS))
		.on('error', gutil.log);
});

// lint
gulp.task('js:lint', function() {
	return gulp.src(cfg.paths.globjs)
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-summary', cfg.summary))
		.pipe(jshint.reporter('fail'));
});

// OTHER
regOtherMinTask('other:cookie', 'vendors/jquery-cookie/', 'jquery.cookie.js', 'jquery.cookie-1.4.0.min.js',
	'/*! jquery.cookie v1.4.0 (c) 2013 Klaus Hartl | MIT */\n');

regOtherMinTask('other:ifvisible', 'vendors/ifvisible/', 'src/ifvisible.js', 'ifvisible.min.js',
	'/*!ifvisible.js v1.0.0 (c) 2013 Serkan Yersen | MIT */\n');

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

regOtherMinTask('other:rl', 'vendors/rl/', 'rl.js', 'rl-1.1.min.js',
	'/*! RainLoop Index Helper v1.1 (c) 2014 RainLoop Team; Licensed under MIT */\n');

gulp.task('package-inc-release', function() {
	fs.writeFileSync('package.json',
		fs.readFileSync('package.json', 'utf8').replace(/"release":\s?"[\d]+",/, '"release": "' +
			(1 + parseInt(pkg.release, 10)) + '",'));
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

	fs.unlinkSync(dist + 'rainloop/v/' + versionFull + '/static/css/less.css');

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

gulp.task('rainloop:clean', ['rainloop:copy', 'rainloop:setup'], function() {
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

gulp.task('rainloop:owncloud:clean', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup'], function() {
	return (cfg.cleanPath) ? cleanDir(cfg.cleanPath) : false;
});

// MAIN
gulp.task('default', ['js:boot', 'js:libs', 'js:lint', 'js:app:min', 'js:admin:min', 'css:main:min']);
gulp.task('fast', ['js:app', 'js:admin', 'css:main']);

gulp.task('rainloop', ['rainloop:copy', 'rainloop:setup', 'rainloop:zip', 'rainloop:md5', 'rainloop:clean']);
gulp.task('rainloop+', ['rainloop', 'package-inc-release']);

gulp.task('owncloud', ['rainloop:owncloud:copy', 'rainloop:owncloud:setup', 'rainloop:owncloud:zip', 'rainloop:owncloud:md5', 'rainloop:owncloud:clean']);

//WATCH
gulp.task('watch', ['fast'], function() {
	gulp.watch(cfg.paths.globjs, {interval: 500}, ['js:app', 'js:admin']);
	gulp.watch(cfg.paths.less.main.watch, {interval: 500}, ['css:main']);
});

// aliases
gulp.task('w', ['watch']);
gulp.task('f', ['fast']);

gulp.task('rl', ['rainloop']);
gulp.task('rl+', ['rainloop+']);
gulp.task('build', ['rainloop']);
gulp.task('build+', ['rainloop+']);
gulp.task('b', ['rainloop']);
gulp.task('b+', ['rainloop+']);

gulp.task('own', ['owncloud']);