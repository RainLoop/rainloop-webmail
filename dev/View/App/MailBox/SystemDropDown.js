
(function () {

	'use strict';

	var
		_ = require('_'),

		kn = require('Knoin/Knoin'),
		AbstractSystemDropDownViewModel = require('View/App/AbstractSystemDropDown')
	;

	/**
	 * @constructor
	 * @extends AbstractSystemDropDownViewModel
	 */
	function SystemDropDownMailBoxAppView()
	{
		AbstractSystemDropDownViewModel.call(this);
		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/App/MailBox/SystemDropDown', 'MailBoxSystemDropDownViewModel'], SystemDropDownMailBoxAppView);
	_.extend(SystemDropDownMailBoxAppView.prototype, AbstractSystemDropDownViewModel.prototype);

	module.exports = SystemDropDownMailBoxAppView;

}());
