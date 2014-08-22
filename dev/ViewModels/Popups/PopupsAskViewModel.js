/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../../External/ko.js'),
		key = require('../../External/key.js'),
		Enums = require('../../Common/Enums.js'),
		Utils = require('../../Common/Utils.js'),
		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsAskViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAsk');

		this.askDesc = ko.observable('');
		this.yesButton = ko.observable('');
		this.noButton = ko.observable('');

		this.yesFocus = ko.observable(false);
		this.noFocus = ko.observable(false);

		this.fYesAction = null;
		this.fNoAction = null;

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = Enums.KeyState.PopupAsk;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsAskViewModel', PopupsAskViewModel);

	PopupsAskViewModel.prototype.clearPopup = function ()
	{
		this.askDesc('');
		this.yesButton(Utils.i18n('POPUPS_ASK/BUTTON_YES'));
		this.noButton(Utils.i18n('POPUPS_ASK/BUTTON_NO'));

		this.yesFocus(false);
		this.noFocus(false);

		this.fYesAction = null;
		this.fNoAction = null;
	};

	PopupsAskViewModel.prototype.yesClick = function ()
	{
		this.cancelCommand();

		if (Utils.isFunc(this.fYesAction))
		{
			this.fYesAction.call(null);
		}
	};

	PopupsAskViewModel.prototype.noClick = function ()
	{
		this.cancelCommand();

		if (Utils.isFunc(this.fNoAction))
		{
			this.fNoAction.call(null);
		}
	};

	/**
	 * @param {string} sAskDesc
	 * @param {Function=} fYesFunc
	 * @param {Function=} fNoFunc
	 * @param {string=} sYesButton
	 * @param {string=} sNoButton
	 */
	PopupsAskViewModel.prototype.onShow = function (sAskDesc, fYesFunc, fNoFunc, sYesButton, sNoButton)
	{
		this.clearPopup();

		this.fYesAction = fYesFunc || null;
		this.fNoAction = fNoFunc || null;

		this.askDesc(sAskDesc || '');
		if (sYesButton)
		{
			this.yesButton(sYesButton);
		}

		if (sYesButton)
		{
			this.yesButton(sNoButton);
		}
	};

	PopupsAskViewModel.prototype.onFocus = function ()
	{
		this.yesFocus(true);
	};

	PopupsAskViewModel.prototype.onBuild = function ()
	{
		key('tab, shift+tab, right, left', Enums.KeyState.PopupAsk, _.bind(function () {
			if (this.yesFocus())
			{
				this.noFocus(true);
			}
			else
			{
				this.yesFocus(true);
			}
			return false;
		}, this));

		key('esc', Enums.KeyState.PopupAsk, _.bind(function () {
			this.noClick();
			return false;
		}, this));
	};

	module.exports = PopupsAskViewModel;

}(module));