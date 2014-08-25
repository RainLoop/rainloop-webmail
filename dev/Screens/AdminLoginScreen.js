/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		_ = require('_'),
		KnoinAbstractScreen = require('KnoinAbstractScreen')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function AdminLoginScreen()
	{
		var AdminLoginViewModel = require('../ViewModels/AdminLoginViewModel.js');
		KnoinAbstractScreen.call(this, 'login', [AdminLoginViewModel]);
	}

	_.extend(AdminLoginScreen.prototype, KnoinAbstractScreen.prototype);

	AdminLoginScreen.prototype.onShow = function ()
	{
		var RL = require('../Boots/AdminApp.js');
		RL.setTitle('');
	};

	module.exports = AdminLoginScreen;

}(module, require));