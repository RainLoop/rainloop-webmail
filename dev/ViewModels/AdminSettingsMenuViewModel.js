
(function () {

	'use strict';

	var
		_ = require('_'),
		
		Globals = require('Common/Globals'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminSettingsMenuViewModel(oScreen)
	{
		KnoinAbstractViewModel.call(this, 'Left', 'AdminMenu');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Admin:SettingsMenu', 'AdminSettingsMenuViewModel'], AdminSettingsMenuViewModel);
	_.extend(AdminSettingsMenuViewModel.prototype, KnoinAbstractViewModel.prototype);

	AdminSettingsMenuViewModel.prototype.link = function (sRoute)
	{
		return '#/' + sRoute;
	};

	module.exports = AdminSettingsMenuViewModel;

}());
