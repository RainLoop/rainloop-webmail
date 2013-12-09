/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends AbstractSystemDropDownViewModel
 */
function MailBoxSystemDropDownViewModel()
{
	AbstractSystemDropDownViewModel.call(this);
	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('MailBoxSystemDropDownViewModel', MailBoxSystemDropDownViewModel, AbstractSystemDropDownViewModel);
