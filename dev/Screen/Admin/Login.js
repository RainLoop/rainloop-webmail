
(function () {

	'use strict';

	var
		_ = require('_'),

		AbstractScreen = require('Knoin/AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends AbstractScreen
	 */
	function LoginAdminScreen()
	{
		AbstractScreen.call(this, 'login', [
			require('View/Admin/Login')
		]);
	}

	_.extend(LoginAdminScreen.prototype, AbstractScreen.prototype);

	LoginAdminScreen.prototype.onShow = function ()
	{
		require('App/Admin').setWindowTitle('');
	};

	module.exports = LoginAdminScreen;

}());