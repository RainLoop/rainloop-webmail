
var
	_ = require('_'),
	key = require('key'),

	Enums = require('Common/Enums'),

	kn = require('Knoin/Knoin'),
	AbstractView = require('Knoin/AbstractView');

/**
 * @constructor
 * @extends AbstractView
 */
function KeyboardShortcutsHelpPopupView()
{
	AbstractView.call(this, 'Popups', 'PopupsKeyboardShortcutsHelp');

	this.sDefaultKeyScope = Enums.KeyState.PopupKeyboardShortcutsHelp;

	kn.constructorEnd(this);
}

kn.extendAsViewModel(['View/Popup/KeyboardShortcutsHelp', 'PopupsKeyboardShortcutsHelpViewModel'], KeyboardShortcutsHelpPopupView);
_.extend(KeyboardShortcutsHelpPopupView.prototype, AbstractView.prototype);

KeyboardShortcutsHelpPopupView.prototype.onBuild = function(oDom)
{
	key('tab, shift+tab, left, right', Enums.KeyState.PopupKeyboardShortcutsHelp, _.throttle(function(event, handler) {

		if (event && handler)
		{
			var
				$tabs = oDom.find('.nav.nav-tabs > li'),
				isNext = handler && ('tab' === handler.shortcut || 'right' === handler.shortcut),
				index = $tabs.index($tabs.filter('.active'));

			if (!isNext && 0 < index)
			{
				index -= 1;
			}
			else if (isNext && index < $tabs.length - 1)
			{
				index += 1;
			}
			else
			{
				index = isNext ? 0 : $tabs.length - 1;
			}

			$tabs.eq(index).find('a[data-toggle="tab"]').tab('show');
			return false;
		}

		return true;

	}, Enums.Magics.Time100ms));
};

module.exports = KeyboardShortcutsHelpPopupView;
