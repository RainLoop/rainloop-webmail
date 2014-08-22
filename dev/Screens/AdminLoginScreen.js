/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		KnoinAbstractScreen = require('../Knoin/KnoinAbstractScreen.js')
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

}(module));