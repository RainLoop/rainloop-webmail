/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
	this.sKeyScope = Enums.KeyState.MessageList;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsAskViewModel', PopupsAskViewModel);

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

	this.sKeyScope = RL.data().keyScope();
	RL.data().keyScope(Enums.KeyState.PopupAsk);
};

PopupsAskViewModel.prototype.onFocus = function ()
{
	this.yesFocus(true);
};

PopupsAskViewModel.prototype.onHide = function ()
{
	RL.data().keyScope(this.sKeyScope);
};

PopupsAskViewModel.prototype.onBuild = function ()
{
	key('tab, right, left', Enums.KeyState.PopupAsk, _.bind(function () {
		if (this.modalVisibility())
		{
			if (this.yesFocus())
			{
				this.noFocus(true);
			}
			else
			{
				this.yesFocus(true);
			}

			return false;
		}
	}, this));
};

