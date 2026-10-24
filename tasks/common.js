/* RainLoop Webmail (c) RainLoop Team | Licensed under MIT */
const del = require('del');

const { config } = require('./config');

exports.del = (dir) => del(dir);

exports.cleanStatic = () => del(config.paths.staticJS) && del(config.paths.staticCSS);
