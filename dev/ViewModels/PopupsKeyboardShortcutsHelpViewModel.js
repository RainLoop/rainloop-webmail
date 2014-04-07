/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsKeyboardShortcutsHelpViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsKeyboardShortcutsHelp');

	this.sKeyScope = Enums.KeyState.None;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsKeyboardShortcutsHelpViewModel', PopupsKeyboardShortcutsHelpViewModel);

PopupsKeyboardShortcutsHelpViewModel.prototype.onShow = function ()
{
	this.sKeyScope = RL.data().keyScope();
	RL.data().keyScope(Enums.KeyState.None);
};

PopupsKeyboardShortcutsHelpViewModel.prototype.onHide = function ()
{
	RL.data().keyScope(this.sKeyScope);
};
