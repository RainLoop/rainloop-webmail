
(function (module, require) {

	'use strict';

	var
		_ = require('_'),

		AbstractSettings = require('Screen:AbstractSettings')
	;

	/**
	 * @constructor
	 * @extends AbstractSettings
	 */
	function AdminSettingsScreen()
	{
		AbstractSettings.call(this, [
			require('View:Admin:SettingsMenu'),
			require('View:Admin:SettingsPane')
		]);
	}

	_.extend(AdminSettingsScreen.prototype, AbstractSettings.prototype);

	AdminSettingsScreen.prototype.onShow = function ()
	{
		require('App:Admin').setTitle('');
	};

	module.exports = AdminSettingsScreen;

}(module, require));