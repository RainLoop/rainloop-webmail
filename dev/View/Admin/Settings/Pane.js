
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Settings = require('Storage/Settings'),
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

		this.capa = !!Settings.settingsGet('PremType');

		this.adminManLoading = ko.computed(function () {
			return '000' !== [
				require('Stores/Admin/Domain').collection.loading() ? '1' : '0',
				require('Stores/Admin/Plugin').collection.loading() ? '1' : '0',
				require('Stores/Admin/Package').collection.loading() ? '1' : '0'
			].join('');
		}, this);

		this.adminManLoadingVisibility = ko.computed(function () {
			return this.adminManLoading() ? 'visible' : 'hidden';
		}, this).extend({'rateLimit': 300});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Admin/Settings/Pane', 'AdminSettingsPaneViewModel'], PaneSettingsAdminView);
	_.extend(PaneSettingsAdminView.prototype, AbstractView.prototype);

	PaneSettingsAdminView.prototype.logoutClick = function ()
	{
		Remote.adminLogout(function () {
			require('App/Admin').loginAndLogoutReload(true);
		});
	};

	module.exports = PaneSettingsAdminView;

}());