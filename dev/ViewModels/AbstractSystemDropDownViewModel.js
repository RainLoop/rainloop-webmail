
(function (module, require) {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote'),

		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AbstractSystemDropDownViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'SystemDropDown');

		this.accounts = Data.accounts;
		this.accountEmail = Data.accountEmail;
		this.accountsLoading = Data.accountsLoading;

		this.accountMenuDropdownTrigger = ko.observable(false);

		this.capaAdditionalAccounts = Settings.capa(Enums.Capa.AdditionalAccounts);

		this.loading = ko.computed(function () {
			return this.accountsLoading();
		}, this);

		this.accountClick = _.bind(this.accountClick, this);
	}

	_.extend(AbstractSystemDropDownViewModel.prototype, KnoinAbstractViewModel.prototype);

	AbstractSystemDropDownViewModel.prototype.accountClick = function (oAccount, oEvent)
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

	AbstractSystemDropDownViewModel.prototype.emailTitle = function ()
	{
		return Data.accountEmail();
	};

	AbstractSystemDropDownViewModel.prototype.settingsClick = function ()
	{
		require('App:Knoin').setHash(LinkBuilder.settings());
	};

	AbstractSystemDropDownViewModel.prototype.settingsHelp = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:KeyboardShortcutsHelp'));
	};

	AbstractSystemDropDownViewModel.prototype.addAccountClick = function ()
	{
		if (this.capaAdditionalAccounts)
		{
			require('App:Knoin').showScreenPopup(require('View:Popup:AddAccount'));
		}
	};

	AbstractSystemDropDownViewModel.prototype.logoutClick = function ()
	{
		Remote.logout(function () {
			if (window.__rlah_clear)
			{
				window.__rlah_clear();
			}

			require('App:RainLoop').loginAndLogoutReload(true,
				Settings.settingsGet('ParentEmail') && 0 < Settings.settingsGet('ParentEmail').length);
		});
	};

	AbstractSystemDropDownViewModel.prototype.onBuild = function ()
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
				require('App:Knoin').showScreenPopup(require('View:Popup:KeyboardShortcutsHelp'));
				return false;
			}
		});
	};

	module.exports = AbstractSystemDropDownViewModel;

}(module, require));