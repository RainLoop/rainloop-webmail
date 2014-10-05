
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/App/Data'),
		Remote = require('Storage/App/Remote'),

		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function AbstractSystemDropDownAppView()
	{
		AbstractView.call(this, 'Right', 'SystemDropDown');

		this.accounts = Data.accounts;
		this.accountEmail = Data.accountEmail;
		this.accountsLoading = Data.accountsLoading;

		this.accountMenuDropdownTrigger = ko.observable(false);

		this.capaAdditionalAccounts = ko.observable(Settings.capa(Enums.Capa.AdditionalAccounts));

		this.loading = ko.computed(function () {
			return this.accountsLoading();
		}, this);

		this.accountClick = _.bind(this.accountClick, this);
	}

	_.extend(AbstractSystemDropDownAppView.prototype, AbstractView.prototype);

	AbstractSystemDropDownAppView.prototype.accountClick = function (oAccount, oEvent)
	{
		if (oAccount && oEvent && !Utils.isUnd(oEvent.which) && 1 === oEvent.which)
		{
			var self = this;
			this.accountsLoading(true);
			_.delay(function () {
				self.accountsLoading(false);
			}, 1000);
		}

		return true;
	};

	AbstractSystemDropDownAppView.prototype.emailTitle = function ()
	{
		return Data.accountEmail();
	};

	AbstractSystemDropDownAppView.prototype.settingsClick = function ()
	{
		require('Knoin/Knoin').setHash(Links.settings());
	};

	AbstractSystemDropDownAppView.prototype.settingsHelp = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/KeyboardShortcutsHelp'));
	};

	AbstractSystemDropDownAppView.prototype.addAccountClick = function ()
	{
		if (this.capaAdditionalAccounts())
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/AddAccount'));
		}
	};

	AbstractSystemDropDownAppView.prototype.logoutClick = function ()
	{
		Remote.logout(function () {
			require('App/App').loginAndLogoutReload(true,
				Settings.settingsGet('ParentEmail') && 0 < Settings.settingsGet('ParentEmail').length);
		});
	};

	AbstractSystemDropDownAppView.prototype.onBuild = function ()
	{
		var self = this;
		key('`', [Enums.KeyState.MessageList, Enums.KeyState.MessageView, Enums.KeyState.Settings], function () {
			if (self.viewModelVisibility())
			{
				self.accountMenuDropdownTrigger(true);
			}
		});

		// shortcuts help
		key('shift+/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView, Enums.KeyState.Settings], function () {
			if (self.viewModelVisibility())
			{
				require('Knoin/Knoin').showScreenPopup(require('View/Popup/KeyboardShortcutsHelp'));
				return false;
			}
		});
	};

	module.exports = AbstractSystemDropDownAppView;

}());