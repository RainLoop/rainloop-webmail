/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends AbstractSystemDropDownViewModel
 */
function SettingsSystemDropDownViewModel()
{
	AbstractSystemDropDownViewModel.call(this);
	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('SettingsSystemDropDownViewModel', SettingsSystemDropDownViewModel, AbstractSystemDropDownViewModel);
