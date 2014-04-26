/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsOpenPGP()
{
	this.openpgpkeys = RL.data().openpgpkeys;
	this.openpgpkeysPublic = RL.data().openpgpkeysPublic;
	this.openpgpkeysPrivate = RL.data().openpgpkeysPrivate;

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

		if (oOpenPgpKeyToRemove && RL.data().openpgpKeyring)
		{
			this.openpgpkeys.remove(function (oOpenPgpKey) {
				return oOpenPgpKeyToRemove === oOpenPgpKey;
			});

			RL.data().openpgpKeyring[oOpenPgpKeyToRemove.isPrivate ? 'privateKeys' : 'publicKeys']
				.removeForId(oOpenPgpKeyToRemove.guid);

			RL.data().openpgpKeyring.store();

			RL.reloadOpenPgpKeys();
		}
	}
};