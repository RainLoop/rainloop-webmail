
var
	_ = require('_'),
	$ = require('$'),
	key = require('key'),

	Enums = require('Common/Enums'),
	Globals = require('Common/Globals'),
	Links = require('Common/Links'),

	Cache = require('Common/Cache'),
	Settings = require('Storage/Settings'),

	kn = require('Knoin/Knoin'),
	AbstractView = require('Knoin/AbstractView');

/**
 * @constructor
 * @param {Object} oScreen
 */
function MenuSettingsUserView(oScreen)
{
	AbstractView.call(this, 'Left', 'SettingsMenu');

	this.leftPanelDisabled = Globals.leftPanelDisabled;

	this.mobile = Settings.appSettingsGet('mobile');

	this.menu = oScreen.menu;

	kn.constructorEnd(this);
}

kn.extendAsViewModel(['View/User/Settings/Menu', 'View/App/Settings/Menu', 'SettingsMenuViewModel'], MenuSettingsUserView);
_.extend(MenuSettingsUserView.prototype, AbstractView.prototype);

MenuSettingsUserView.prototype.onBuild = function(oDom)
{
	if (this.mobile)
	{
		oDom
			.on('click', '.b-settings-menu .e-item.selectable', function() {
				Globals.leftPanelDisabled(true);
			});
	}

	key('up, down', Enums.KeyState.Settings, _.throttle(function(event, handler) {

		var
			bUp = handler && 'up' === handler.shortcut,
			$items = $('.b-settings-menu .e-item', oDom);

		if (event && $items.length)
		{
			var iIndex = $items.index($items.filter('.selected'));
			if (bUp && 0 < iIndex)
			{
				iIndex -= 1;
			}
			else if (!bUp && iIndex < $items.length - 1)
			{
				iIndex += 1;
			}

			var sH = $items.eq(iIndex).attr('href');
			if (sH)
			{
				kn.setHash(sH, false, true);
			}
		}

	}, 200)); // eslint-disable-line no-magic-numbers
};

MenuSettingsUserView.prototype.link = function(sRoute)
{
	return Links.settings(sRoute);
};

MenuSettingsUserView.prototype.backToMailBoxClick = function()
{
	kn.setHash(Links.inbox(Cache.getFolderInboxName()));
};

module.exports = MenuSettingsUserView;
