/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

var window = require('./window.js');
module.exports = window.Notification && window.Notification.requestPermission ? window.Notification : null;