
(function () {

	'use strict';

	var
		_ = require('_'),

		Globals = require('Common/Globals'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends AbstractView
	 */
	function MenuSettingsAdminView(oScreen)
	{
		AbstractView.call(this, 'Left', 'AdminMenu');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Admin/Settings/Menu', 'AdminSettingsMenuViewModel'], MenuSettingsAdminView);
	_.extend(MenuSettingsAdminView.prototype, AbstractView.prototype);

	MenuSettingsAdminView.prototype.link = function (sRoute)
	{
		return '#/' + sRoute;
	};

	module.exports = MenuSettingsAdminView;

}());
