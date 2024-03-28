/* RainLoop Webmail (c) RainLoop Team | Licensed under MIT */
const gulp = require('gulp');
const del = require('del');
const fs = require('fs');

const { config } = require('./config');

exports.del = (dir) => del(dir);

exports.copy = (sFile, sNewFile, done) => {
	fs.writeFileSync(sNewFile, fs.readFileSync(sFile));
	done();
};

exports.getHead = () => config.head.agpl;

exports.cleanStatic = () => del(config.paths.staticJS) && del(config.paths.staticCSS);
