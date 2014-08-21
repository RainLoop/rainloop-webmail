/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		window = require('../External/window.js'),
		key = require('../External/key.js'),
		
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),

		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AbstractSystemDropDownViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'SystemDropDown');

		var oData = RL.data();

		this.accounts = oData.accounts;
		this.accountEmail = oData.accountEmail;
		this.accountsLoading = oData.accountsLoading;

		this.accountMenuDropdownTrigger = ko.observable(false);

		this.capaAdditionalAccounts = RL.capa(Enums.Capa.AdditionalAccounts);

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
		return RL.data().accountEmail();
	};

	AbstractSystemDropDownViewModel.prototype.settingsClick = function ()
	{
		kn.setHash(LinkBuilder.settings());
	};

	AbstractSystemDropDownViewModel.prototype.settingsHelp = function ()
	{
		kn.showScreenPopup(PopupsKeyboardShortcutsHelpViewModel);
	};

	AbstractSystemDropDownViewModel.prototype.addAccountClick = function ()
	{
		if (this.capaAdditionalAccounts)
		{
			kn.showScreenPopup(PopupsAddAccountViewModel);
		}
	};

	AbstractSystemDropDownViewModel.prototype.logoutClick = function ()
	{
		Remote.logout(function () {
			if (window.__rlah_clear)
			{
				window.__rlah_clear();
			}

			RL.loginAndLogoutReload(true, RL.settingsGet('ParentEmail') && 0 < RL.settingsGet('ParentEmail').length);
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
				kn.showScreenPopup(PopupsKeyboardShortcutsHelpViewModel);
				return false;
			}
		});
	};

	module.exports = new AbstractSystemDropDownViewModel();

}(module));