
(function () {

	'use strict';

	var
		_ = require('_'),

		Globals = require('Common/Globals'),
		Links = require('Common/Links'),

		Cache = require('Storage/User/Cache'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends AbstractView
	 */
	function MenuSettingsUserView(oScreen)
	{
		AbstractView.call(this, 'Left', 'SettingsMenu');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/Settings/Menu', 'View/App/Settings/Menu', 'SettingsMenuViewModel'], MenuSettingsUserView);
	_.extend(MenuSettingsUserView.prototype, AbstractView.prototype);

	MenuSettingsUserView.prototype.link = function (sRoute)
	{
		return Links.settings(sRoute);
	};

	MenuSettingsUserView.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(Links.inbox(Cache.getFolderInboxName()));
	};

	module.exports = MenuSettingsUserView;

}());