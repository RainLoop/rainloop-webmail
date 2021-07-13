/* SnappyMail Webmail (c) SnappyMail Team | Licensed under AGPL 3 */
const path = require('path');
const { argv } = require('yargs');

const config = {
	head: {
		agpl: '/* SnappyMail Webmail (c) SnappyMail | Licensed under AGPL v3 */'
	},
	devVersion: '0.0.0',

	destPath: '',
	cleanPath: '',

	paths: {}
};

config.paths.globjs = 'dev/**/*.js';
config.paths.static = 'snappymail/v/' + config.devVersion + '/static/';
config.paths.staticJS = 'snappymail/v/' + config.devVersion + '/static/js/';
config.paths.staticMinJS = 'snappymail/v/' + config.devVersion + '/static/js/min/';
config.paths.staticCSS = 'snappymail/v/' + config.devVersion + '/static/css/';

config.paths.assets = {
	src: 'assets/**/*.*'
};

config.paths.less = {
	main: {
		src: 'dev/Styles/@Main.less',
		options: {
			paths: [path.join(__dirname, 'dev', 'Styles'), path.join(__dirname, 'vendors', 'bootstrap', 'less')]
		}
	},
	admin: {
		src: 'dev/Styles/@Admin.less'
	}
};

config.paths.css = {
	main: {
		name: 'app.css',
		src: [
			'vendors/normalize.css/normalize.css',
			'vendors/fontastic/styles.css'
		]
	},
	admin: {
		name: 'admin.css'
	},
	boot: {
		name: 'boot.css',
		src: [
			'dev/Styles/@Boot.css'
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
			'vendors/routes/hasher.js',
			'vendors/routes/crossroads.js',
			'vendors/jua/jua.js',
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
