/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		kn = require('kn'),
		Globals = require('Globals'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
	;

	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminMenuViewModel(oScreen)
	{
		KnoinAbstractViewModel.call(this, 'Left', 'AdminMenu');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AdminMenuViewModel', AdminMenuViewModel);

	AdminMenuViewModel.prototype.link = function (sRoute)
	{
		return '#/' + sRoute;
	};

	module.exports = AdminMenuViewModel;

}(module, require));
