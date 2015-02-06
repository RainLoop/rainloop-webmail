
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		AccountStore = require('Stores/User/Account'),

		Settings = require('Storage/Settings'),
		Remote = require('Storage/User/Remote'),

		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function AbstractSystemDropDownUserView()
	{
		AbstractView.call(this, 'Right', 'SystemDropDown');

		this.accountEmail = AccountStore.email;

		this.accounts = AccountStore.accounts;
		this.accountsUnreadCount = AccountStore.accountsUnreadCount;

		this.accountMenuDropdownTrigger = ko.observable(false);
		this.capaAdditionalAccounts = ko.observable(Settings.capa(Enums.Capa.AdditionalAccounts));

		this.accountClick = _.bind(this.accountClick, this);
	}

	_.extend(AbstractSystemDropDownUserView.prototype, AbstractView.prototype);

	AbstractSystemDropDownUserView.prototype.accountClick = function (oAccount, oEvent)
	{
		if (oAccount && oEvent && !Utils.isUnd(oEvent.which) && 1 === oEvent.which)
		{
			AccountStore.accounts.loading(true);

			_.delay(function () {
				AccountStore.accounts.loading(false);
			}, 1000);
		}

		return true;
	};

	AbstractSystemDropDownUserView.prototype.emailTitle = function ()
	{
		return AccountStore.email();
	};

	AbstractSystemDropDownUserView.prototype.settingsClick = function ()
	{
		require('Knoin/Knoin').setHash(Links.settings());
	};

	AbstractSystemDropDownUserView.prototype.settingsHelp = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/KeyboardShortcutsHelp'));
	};

	AbstractSystemDropDownUserView.prototype.addAccountClick = function ()
	{
		if (this.capaAdditionalAccounts())
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/Account'));
		}
	};

	AbstractSystemDropDownUserView.prototype.logoutClick = function ()
	{
		Remote.logout(function () {
			require('App/User').loginAndLogoutReload(true,
				Settings.settingsGet('ParentEmail') && 0 < Settings.settingsGet('ParentEmail').length);
		});
	};

	AbstractSystemDropDownUserView.prototype.onBuild = function ()
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

	module.exports = AbstractSystemDropDownUserView;

}());