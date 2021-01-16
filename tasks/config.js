/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const path = require('path');
const { argv } = require('yargs');

const config = {
	head: {
		rainloop: '/* RainLoop Webmail (c) RainLoop Team | Licensed under RainLoop Software License */',
		agpl: '/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL v3 */'
	},
	devVersion: '0.0.0',
	releasesPath: 'build/dist/releases',
	community: !argv.pro,
	source: !!argv.source,
	watch: false,
	watchInterval: 1000,
	googleCompile: false,

	rainloopBuilded: false,
	destPath: '',
	cleanPath: '',
	zipSrcPath: '',
	zipFile: '',
	// zipFileShort: '',

	paths: {}
};

config.paths.globjs = 'dev/**/*.js';
config.paths.static = 'rainloop/v/' + config.devVersion + '/static/';
config.paths.staticJS = 'rainloop/v/' + config.devVersion + '/static/js/';
config.paths.staticMinJS = 'rainloop/v/' + config.devVersion + '/static/js/min/';
config.paths.staticCSS = 'rainloop/v/' + config.devVersion + '/static/css/';
config.paths.momentLocales = 'rainloop/v/' + config.devVersion + '/app/localization/moment/';

config.paths.assets = {
	src: 'assets/**/*.*'
};

config.paths.less = {
	main: {
		src: 'dev/Styles/@Main.less',
		watch: ['dev/Styles/*.less'],
		options: {
			paths: [path.join(__dirname, 'dev', 'Styles'), path.join(__dirname, 'vendors', 'bootstrap', 'less')]
		}
	}
};

config.paths.css = {
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
		src: ['vendors/fontastic/styles.css', 'dev/Styles/_social.css']
	}
};

config.paths.js = {
	moment: {
		locales: ['node_modules/moment/locale/*.js']
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
			'vendors/qr.js/qr.min.js', // fixed (license)
			'vendors/bootstrap/js/bootstrap.min.js', // fixed
			'node_modules/underscore/underscore-min.js',
			'node_modules/moment/min/moment.min.js',
			'node_modules/knockout/build/output/knockout-latest.js',
			'node_modules/knockout-sortable/build/knockout-sortable.min.js ',
			'node_modules/matchmedia-polyfill/matchMedia.js',
			'node_modules/matchmedia-polyfill/matchMedia.addListener.js',
			'node_modules/simplestatemanager/dist/ssm.min.js',
			'node_modules/autolinker/dist/Autolinker.min.js',
			'node_modules/opentip/lib/opentip.js',
			'node_modules/opentip/lib/adapter-jquery.js',
			'vendors/lightgallery/dist/js/lightgallery.min.js', // license
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

exports.config = config;
