
var
	_ = require('_'),

	Globals = require('Common/Globals'),

	kn = require('Knoin/Knoin'),
	AbstractView = require('Knoin/AbstractView');

/**
 * @constructor
 * @param {?} oScreen
 *
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

MenuSettingsAdminView.prototype.link = function(sRoute)
{
	return '#/' + sRoute;
};

MenuSettingsAdminView.prototype.onBuild = function(oDom)
{
	key('up, down', _.throttle(function(event, handler) {

		var
			sH = '',
			iIndex = -1,
			bUp = handler && 'up' === handler.shortcut,
			$items = $('.b-admin-menu .e-item', oDom);

		if (event && $items.length)
		{
			iIndex = $items.index($items.filter('.selected'));
			if (bUp && 0 < iIndex)
			{
				iIndex -= 1;
			}
			else if (!bUp && iIndex < $items.length - 1)
			{
				iIndex += 1;
			}

			sH = $items.eq(iIndex).attr('href');
			if (sH)
			{
				kn.setHash(sH, false, true);
			}
		}

	}, 200));
};

module.exports = MenuSettingsAdminView;
