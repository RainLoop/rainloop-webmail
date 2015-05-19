
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Events = require('Common/Events'),

		AppStore = require('Stores/User/App'),
		AccountStore = require('Stores/User/Account'),
		MessageStore = require('Stores/User/Message'),

		Settings = require('Storage/Settings'),

		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function AbstractSystemDropDownUserView()
	{
		AbstractView.call(this, 'Right', 'SystemDropDown');

		this.logoImg = Utils.trim(Settings.settingsGet('UserLogo'));
		this.logoTitle = Utils.trim(Settings.settingsGet('UserLogoTitle'));

		this.allowSettings = !!Settings.capa(Enums.Capa.Settings);
		this.allowHelp = !!Settings.capa(Enums.Capa.Help);

		this.currentAudio = AppStore.currentAudio;

		this.accountEmail = AccountStore.email;

		this.accounts = AccountStore.accounts;
		this.accountsUnreadCount = AccountStore.accountsUnreadCount;

		this.accountMenuDropdownTrigger = ko.observable(false);
		this.capaAdditionalAccounts = ko.observable(Settings.capa(Enums.Capa.AdditionalAccounts));

		this.accountClick = _.bind(this.accountClick, this);

		this.accountClick = _.bind(this.accountClick, this);

		Events.sub('audio.stop', function () {
			AppStore.currentAudio('');
		});

		Events.sub('audio.start', function (sName) {
			AppStore.currentAudio(sName);
		});
	}

	_.extend(AbstractSystemDropDownUserView.prototype, AbstractView.prototype);

	AbstractSystemDropDownUserView.prototype.stopPlay = function ()
	{
		Events.pub('audio.api.stop');
	};

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
		if (Settings.capa(Enums.Capa.Settings))
		{
			require('Knoin/Knoin').setHash(Links.settings());
		}
	};

	AbstractSystemDropDownUserView.prototype.settingsHelp = function ()
	{
		if (Settings.capa(Enums.Capa.Help))
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/KeyboardShortcutsHelp'));
		}
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
		require('App/User').logout();
	};

	AbstractSystemDropDownUserView.prototype.onBuild = function ()
	{
		var self = this;
		key('`', [Enums.KeyState.MessageList, Enums.KeyState.MessageView, Enums.KeyState.Settings], function () {
			if (self.viewModelVisibility())
			{
				MessageStore.messageFullScreenMode(false);

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