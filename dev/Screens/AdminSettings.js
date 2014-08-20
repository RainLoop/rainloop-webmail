/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('./External/underscore.js'),
		AbstractSettings = require('./Screens/AbstractSettings.js'),
		AdminMenuViewModel = require('./ViewModels/AdminMenuViewModel.js'),
		AdminPaneViewModel = require('./ViewModels/AdminPaneViewModel.js')
	;

	/**
	 * @constructor
	 * @extends AbstractSettings
	 */
	function AdminSettingsScreen()
	{
		AbstractSettings.call(this, [
			AdminMenuViewModel,
			AdminPaneViewModel
		]);
	}

	_.extend(AdminSettingsScreen.prototype, AbstractSettings.prototype);

	AdminSettingsScreen.prototype.onShow = function ()
	{
		RL.setTitle(''); // TODO cjs
	};

	module.exports = AdminSettingsScreen;

}(module));