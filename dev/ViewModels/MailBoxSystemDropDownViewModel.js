/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		kn = require('../Knoin/Knoin.js'),
		AbstractSystemDropDownViewModel = require('./AbstractSystemDropDownViewModel.js')
	;

	/**
	 * @constructor
	 * @extends AbstractSystemDropDownViewModel
	 */
	function MailBoxSystemDropDownViewModel()
	{
		AbstractSystemDropDownViewModel.call(this);
		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('MailBoxSystemDropDownViewModel', MailBoxSystemDropDownViewModel, AbstractSystemDropDownViewModel);

	module.exports = MailBoxSystemDropDownViewModel;

}(module));
