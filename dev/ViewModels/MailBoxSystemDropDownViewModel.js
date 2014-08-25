/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		kn = require('kn'),
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

}(module, require));
