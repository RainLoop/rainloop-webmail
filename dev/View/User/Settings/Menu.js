
(function () {

	'use strict';

	var
		_ = require('_'),
		key = require('key'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Links = require('Common/Links'),

		Cache = require('Common/Cache'),

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

	MenuSettingsUserView.prototype.onBuild = function (oDom)
	{
//		var self = this;
//		key('esc', Enums.KeyState.Settings, function () {
//			self.backToMailBoxClick();
//		});

		key('up, down', Enums.KeyState.Settings, _.throttle(function (event, handler) {

			var
				sH = '',
				iIndex = -1,
				bUp = handler && 'up' === handler.shortcut,
				$items = $('.b-settings-menu .e-item', oDom)
			;

			if (event && $items.length)
			{
				iIndex = $items.index($items.filter('.selected'));
				if (bUp && iIndex > 0)
				{
					iIndex--;
				}
				else if (!bUp && iIndex < $items.length - 1)
				{
					iIndex++;
				}

				sH = $items.eq(iIndex).attr('href');
				if (sH)
				{
					kn.setHash(sH, false, true);
				}
			}

		}, 200));
	};

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