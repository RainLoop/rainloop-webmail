/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),

		AppSettings = require('../Storages/AppSettings.js'),
		Data = require('../Storages/AdminDataStorage.js'),
		Remote = require('../Storages/AdminAjaxRemoteStorage.js'),

		RL = require('../Boots/AdminApp.js'),
		
		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminPaneViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'AdminPane');

		this.adminDomain = ko.observable(AppSettings.settingsGet('AdminDomain'));
		this.version = ko.observable(AppSettings.settingsGet('Version'));

		this.adminManLoadingVisibility = Data.adminManLoadingVisibility;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AdminPaneViewModel', AdminPaneViewModel);

	AdminPaneViewModel.prototype.logoutClick = function ()
	{
		Remote.adminLogout(function () {
			RL.loginAndLogoutReload();
		});
	};

	module.exports = AdminPaneViewModel;

}(module));