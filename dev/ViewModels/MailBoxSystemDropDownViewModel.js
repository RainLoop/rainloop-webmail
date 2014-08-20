/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		Utils = require('../Common/Utils.js'),
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

	Utils.extendAsViewModel('MailBoxSystemDropDownViewModel', MailBoxSystemDropDownViewModel, AbstractSystemDropDownViewModel);

	module.exports = MailBoxSystemDropDownViewModel;

}(module));
