
(function () {

	'use strict';

	var
		_ = require('_'),

		kn = require('Knoin/Knoin'),
		AbstractSystemDropDownViewModel = require('View/User/AbstractSystemDropDown')
	;

	/**
	 * @constructor
	 * @extends AbstractSystemDropDownViewModel
	 */
	function SystemDropDownMailBoxUserView()
	{
		AbstractSystemDropDownViewModel.call(this);
		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/MailBox/SystemDropDown', 'View/App/MailBox/SystemDropDown', 'MailBoxSystemDropDownViewModel'], SystemDropDownMailBoxUserView);
	_.extend(SystemDropDownMailBoxUserView.prototype, AbstractSystemDropDownViewModel.prototype);

	module.exports = SystemDropDownMailBoxUserView;

}());
