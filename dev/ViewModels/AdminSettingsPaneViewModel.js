
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminSettingsPaneViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'AdminPane');

		this.adminDomain = ko.observable(Settings.settingsGet('AdminDomain'));
		this.version = ko.observable(Settings.settingsGet('Version'));

		this.adminManLoadingVisibility = Data.adminManLoadingVisibility;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Admin:SettingsPane', 'AdminSettingsPaneViewModel'], AdminSettingsPaneViewModel);
	_.extend(AdminSettingsPaneViewModel.prototype, KnoinAbstractViewModel.prototype);

	AdminSettingsPaneViewModel.prototype.logoutClick = function ()
	{
		Remote.adminLogout(function () {
			require('App:Admin').loginAndLogoutReload();
		});
	};

	module.exports = AdminSettingsPaneViewModel;

}());