
(function () {

	'use strict';

	var
		_ = require('_'),
		
		kn = require('App:Knoin'),
		AbstractSystemDropDownViewModel = require('View:RainLoop:AbstractSystemDropDown')
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

	kn.extendAsViewModel(['View:RainLoop:MailBoxSystemDropDown', 'MailBoxSystemDropDownViewModel'], MailBoxSystemDropDownViewModel);
	_.extend(MailBoxSystemDropDownViewModel.prototype, AbstractSystemDropDownViewModel.prototype);

	module.exports = MailBoxSystemDropDownViewModel;

}());
