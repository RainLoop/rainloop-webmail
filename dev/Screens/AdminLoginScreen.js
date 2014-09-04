
(function () {

	'use strict';

	var
		_ = require('_'),

		KnoinAbstractScreen = require('Knoin:AbstractScreen')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractScreen
	 */
	function AdminLoginScreen()
	{
		KnoinAbstractScreen.call(this, 'login', [
			require('View:Admin:Login')
		]);
	}

	_.extend(AdminLoginScreen.prototype, KnoinAbstractScreen.prototype);

	AdminLoginScreen.prototype.onShow = function ()
	{
		require('App:Admin').setTitle('');
	};

	module.exports = AdminLoginScreen;

}());