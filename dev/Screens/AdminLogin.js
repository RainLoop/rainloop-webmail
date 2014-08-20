/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('./External/underscore.js'),
		KnoinAbstractScreen = require('./Knoin/KnoinAbstractScreen.js'),
		AdminLoginViewModel = require('./ViewModels/AdminLoginViewModel.js')
	;
	
	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function AdminLoginScreen()
	{
		KnoinAbstractScreen.call(this, 'login', [AdminLoginViewModel]);
	}

	_.extend(AdminLoginScreen.prototype, KnoinAbstractScreen.prototype);

	AdminLoginScreen.prototype.onShow = function ()
	{
		RL.setTitle(''); // TODO cjs
	};

	module.exports = AdminLoginScreen;

}(module));