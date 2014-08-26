/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		AppSettings = require('../Storages/AppSettings.js'),
		Data = require('../Storages/AdminDataStorage.js'),
		Remote = require('../Storages/AdminAjaxRemoteStorage.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
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
			var App = require('../Apps/AdminApp.js');
			App.loginAndLogoutReload();
		});
	};

	module.exports = AdminPaneViewModel;

}(module, require));