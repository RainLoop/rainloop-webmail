/* RainLoop Webmail (c) RainLoop Team | Licensed under AGPL 3 */
const gulp = require('gulp');
const del = require('del');
const fs = require('node-fs');

const { config } = require('./config');

exports.del = (dir) => del(dir);

exports.copy = (sFile, sNewFile, done) => {
	fs.writeFileSync(sNewFile, fs.readFileSync(sFile));
	done();
};

exports.getHead = () => config.head.agpl;

exports.cleanStatic = () => del(config.paths.static);
