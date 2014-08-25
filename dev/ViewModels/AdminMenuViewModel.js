/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		kn = require('../Knoin/Knoin.js'),
		Globals = require('../Common/Globals.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
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

}(module));
