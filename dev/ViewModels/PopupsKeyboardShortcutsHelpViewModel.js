/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsKeyboardShortcutsHelpViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsKeyboardShortcutsHelp');

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsKeyboardShortcutsHelpViewModel', PopupsKeyboardShortcutsHelpViewModel);
