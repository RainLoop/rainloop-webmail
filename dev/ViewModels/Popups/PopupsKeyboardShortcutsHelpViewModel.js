/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../../External/underscore.js'),
		key = require('../../External/key.js'),
		Enums = require('../../Common/Enums.js'),
		Utils = require('../../Common/Utils.js'),
		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsKeyboardShortcutsHelpViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsKeyboardShortcutsHelp');

		this.sDefaultKeyScope = Enums.KeyState.PopupKeyboardShortcutsHelp;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsKeyboardShortcutsHelpViewModel', PopupsKeyboardShortcutsHelpViewModel);

	PopupsKeyboardShortcutsHelpViewModel.prototype.onBuild = function (oDom)
	{
		key('tab, shift+tab, left, right', Enums.KeyState.PopupKeyboardShortcutsHelp, _.bind(function (event, handler) {
			if (event && handler)
			{
				var
					$tabs = oDom.find('.nav.nav-tabs > li'),
					bNext = handler && ('tab' === handler.shortcut || 'right' === handler.shortcut),
					iIndex = $tabs.index($tabs.filter('.active'))
				;

				if (!bNext && iIndex > 0)
				{
					iIndex--;
				}
				else if (bNext && iIndex < $tabs.length - 1)
				{
					iIndex++;
				}
				else
				{
					iIndex = bNext ? 0 : $tabs.length - 1;
				}

				$tabs.eq(iIndex).find('a[data-toggle="tab"]').tab('show');
				return false;
			}
		}, this));
	};

	module.exports = new AdminPaneViewModel();

}(module));