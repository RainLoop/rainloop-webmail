
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/Admin/Data'),
		Remote = require('Storage/Admin/Remote'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function PaneSettingsAdminView()
	{
		AbstractView.call(this, 'Right', 'AdminPane');

		this.adminDomain = ko.observable(Settings.settingsGet('AdminDomain'));
		this.version = ko.observable(Settings.settingsGet('Version'));

		this.adminManLoadingVisibility = Data.adminManLoadingVisibility;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Admin/Settings/Pane', 'AdminSettingsPaneViewModel'], PaneSettingsAdminView);
	_.extend(PaneSettingsAdminView.prototype, AbstractView.prototype);

	PaneSettingsAdminView.prototype.logoutClick = function ()
	{
		Remote.adminLogout(function () {
			require('App/Admin').loginAndLogoutReload();
		});
	};

	module.exports = PaneSettingsAdminView;

}());