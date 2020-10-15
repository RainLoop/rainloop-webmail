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
	zipFileShort: '',

	paths: {}
};

config.paths.globjs = 'dev/**/*.js';
config.paths.static = 'rainloop/v/' + config.devVersion + '/static/';
config.paths.staticJS = 'rainloop/v/' + config.devVersion + '/static/js/';
config.paths.staticMinJS = 'rainloop/v/' + config.devVersion + '/static/js/min/';
config.paths.staticCSS = 'rainloop/v/' + config.devVersion + '/static/css/';

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
			'vendors/normalize.css/normalize.css',
			'vendors/fontastic/styles.css',
			'vendors/inputosaurus/inputosaurus.css'
		]
	},
	boot: {
		name: 'boot.css',
		src: [
			'dev/Styles/@Boot.css',
			'dev/Styles/_progressjs.css'
		]
	}
};

config.paths.js = {
	libs: {
		name: 'libs.js',
		src: [
			'dev/polyfill.js',
			'dev/prototype.js',
			'dev/External/ifvisible.js',
			'dev/dragdropgecko.js',
			'dev/shortcuts.js',
			'vendors/inputosaurus/inputosaurus.js',
			'vendors/routes/signals.min.js',
			'vendors/routes/hasher.min.js',
			'vendors/routes/crossroads.min.js',
			'vendors/jua/jua.min.js',
			'vendors/qr.js/qr.min.js',
			'vendors/bootstrap/js/bootstrap.native.js',
			'vendors/knockout/build/output/knockout-latest.js',
			'vendors/squire/build/squire-raw.js',
			'dev/External/SquireUI.js'
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
