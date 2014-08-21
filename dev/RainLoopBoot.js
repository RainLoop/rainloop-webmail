/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

'use strict';

var
	kn = require('./Knoin/Knoin.js'),
	RL = require('./Boots/RainLoopApp.js'),
	Remote = require('./Storages/WebMailAjaxRemoteStorage.js')
;

kn.bootstart(RL, Remote);