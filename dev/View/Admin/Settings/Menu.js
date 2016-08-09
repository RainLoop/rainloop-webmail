
var
	_ = require('_'),
	$ = require('$'),
	key = require('key'),

	Globals = require('Common/Globals'),
	Enums = require('Common/Enums'),

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
			bUp = handler && 'up' === handler.shortcut,
			$items = $('.b-admin-menu .e-item', oDom);

		if (event && $items.length)
		{
			var index = $items.index($items.filter('.selected'));
			if (bUp && 0 < index)
			{
				index -= 1;
			}
			else if (!bUp && index < $items.length - 1)
			{
				index += 1;
			}

			sH = $items.eq(index).attr('href');
			if (sH)
			{
				kn.setHash(sH, false, true);
			}
		}

	}, Enums.Magics.Time200ms));
};

module.exports = MenuSettingsAdminView;
