/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsOpenPGP()
{
	this.openpgpkeys = RL.data().openpgpkeys;

	this.openpgpkeysPublic = ko.computed(function () {
		return _.filter(this.openpgpkeys(), function (oItem) {
			return !!(oItem && !oItem.isPrivate);
		});
	}, this);

	this.openpgpkeysPrivate = ko.computed(function () {
		return _.filter(this.openpgpkeys(), function (oItem) {
			return !!(oItem && oItem.isPrivate);
		});
	}, this);

	this.openPgpKeyForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.deleteAccess(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.deleteAccess(true);
			}
		}
	]});
}

Utils.addSettingsViewModel(SettingsOpenPGP, 'SettingsOpenPGP', 'SETTINGS_LABELS/LABEL_OPEN_PGP_NAME', 'openpgp');

SettingsOpenPGP.prototype.addOpenPgpKey = function ()
{
	kn.showScreenPopup(PopupsAddOpenPgpKeyViewModel);
};

SettingsOpenPGP.prototype.generateOpenPgpKey = function ()
{
	kn.showScreenPopup(PopupsGenerateNewOpenPgpKeyViewModel);
};

SettingsOpenPGP.prototype.viewOpenPgpKey = function (oOpenPgpKey)
{
	if (oOpenPgpKey)
	{
		kn.showScreenPopup(PopupsViewOpenPgpKeyViewModel, [oOpenPgpKey]);
	}
};

/**
 * @param {OpenPgpKeyModel} oOpenPgpKeyToRemove
 */
SettingsOpenPGP.prototype.deleteOpenPgpKey = function (oOpenPgpKeyToRemove)
{
	if (oOpenPgpKeyToRemove && oOpenPgpKeyToRemove.deleteAccess())
	{
		this.openPgpKeyForDeletion(null);

		var
			oOpenpgpKeyring = RL.data().openpgpKeyring,
			fRemoveAccount = function (oOpenPgpKey) {
				return oOpenPgpKeyToRemove === oOpenPgpKey;
			}
		;

		if (oOpenPgpKeyToRemove && oOpenpgpKeyring)
		{
			this.openpgpkeys.remove(fRemoveAccount);

			oOpenpgpKeyring.removeKey(oOpenPgpKeyToRemove.index);
			oOpenpgpKeyring.store();

			RL.reloadOpenPgpKeys();
		}
	}
};