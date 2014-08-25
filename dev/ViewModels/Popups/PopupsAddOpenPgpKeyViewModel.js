/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Utils'),

		Data = require('../../Storages/WebMailDataStorage.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsAddOpenPgpKeyViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAddOpenPgpKey');

		var RL = require('../../Boots/RainLoopApp.js');

		this.key = ko.observable('');
		this.key.error = ko.observable(false);
		this.key.focus = ko.observable(false);

		this.key.subscribe(function () {
			this.key.error(false);
		}, this);

		this.addOpenPgpKeyCommand = Utils.createCommand(this, function () {

			var
				iCount = 30,
				aMatch = null,
				sKey = Utils.trim(this.key()),
				oReg = /[\-]{3,6}BEGIN[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[\-]{3,6}[\s\S]+?[\-]{3,6}END[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[\-]{3,6}/gi,
				oOpenpgpKeyring = Data.openpgpKeyring
			;

			sKey = sKey.replace(/[\r\n]([a-zA-Z0-9]{2,}:[^\r\n]+)[\r\n]+([a-zA-Z0-9\/\\+=]{10,})/g, '\n$1!-!N!-!$2')
				.replace(/[\n\r]+/g, '\n').replace(/!-!N!-!/g, '\n\n');

			this.key.error('' === sKey);

			if (!oOpenpgpKeyring || this.key.error())
			{
				return false;
			}

			do
			{
				aMatch = oReg.exec(sKey);
				if (!aMatch || 0 > iCount)
				{
					break;
				}

				if (aMatch[0] && aMatch[1] && aMatch[2] && aMatch[1] === aMatch[2])
				{
					if ('PRIVATE' === aMatch[1])
					{
						oOpenpgpKeyring.privateKeys.importKey(aMatch[0]);
					}
					else if ('PUBLIC' === aMatch[1])
					{
						oOpenpgpKeyring.publicKeys.importKey(aMatch[0]);
					}
				}

				iCount--;
			}
			while (true);

			oOpenpgpKeyring.store();

			RL.reloadOpenPgpKeys();
			Utils.delegateRun(this, 'cancelCommand');

			return true;
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsAddOpenPgpKeyViewModel', PopupsAddOpenPgpKeyViewModel);

	PopupsAddOpenPgpKeyViewModel.prototype.clearPopup = function ()
	{
		this.key('');
		this.key.error(false);
	};

	PopupsAddOpenPgpKeyViewModel.prototype.onShow = function ()
	{
		this.clearPopup();
	};

	PopupsAddOpenPgpKeyViewModel.prototype.onFocus = function ()
	{
		this.key.focus(true);
	};

	module.exports = PopupsAddOpenPgpKeyViewModel;

}(module, require));