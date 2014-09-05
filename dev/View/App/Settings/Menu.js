
(function () {

	'use strict';

	var
		_ = require('_'),

		Globals = require('Common/Globals'),
		LinkBuilder = require('Common/LinkBuilder'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends AbstractView
	 */
	function MenuSettingsAppView(oScreen)
	{
		AbstractView.call(this, 'Left', 'SettingsMenu');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/App/Settings/Menu', 'SettingsMenuViewModel'], MenuSettingsAppView);
	_.extend(MenuSettingsAppView.prototype, AbstractView.prototype);

	MenuSettingsAppView.prototype.link = function (sRoute)
	{
		return LinkBuilder.settings(sRoute);
	};

	MenuSettingsAppView.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(LinkBuilder.inbox());
	};

	module.exports = MenuSettingsAppView;

}());