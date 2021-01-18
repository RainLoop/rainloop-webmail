/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const webpack = require('webpack');
const gutil = require('gulp-util');

const { config } = require('./config');

const webpackCfgBuilder = require('../webpack.config.builder.js');

const webpackError = (err) => {
	if (err) {
		gutil.log('[webpack]', '---');
		gutil.log('[webpack]', err.error ? err.error.toString() : '');
		gutil.log('[webpack]', err.message || '');
		gutil.log('[webpack]', '---');
	}
};

const webpackCallback = (done) => (err, stats) => {
	if (err) {
		throw new gutil.PluginError('webpack', err);
	} else if (stats && stats.compilation && stats.compilation.errors && stats.compilation.errors[0]) {
		throw new gutil.PluginError('webpack', stats.compilation.errors[0]);
	}

	done();
};

exports.webpack = (done) => {
	webpack(webpackCfgBuilder(config.paths.staticJS, 'production'), webpackCallback(done));
};
