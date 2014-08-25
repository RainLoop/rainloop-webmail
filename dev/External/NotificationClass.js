/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

var w = require('window');
module.exports = w.Notification && w.Notification.requestPermission ? w.Notification : null;