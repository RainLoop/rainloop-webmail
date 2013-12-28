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
	if (Utils.isFunc(this.fYesAction))
	{
		this.fYesAction.call(null);
	}

	this.cancelCommand();
};

PopupsAskViewModel.prototype.noClick = function ()
{
	if (Utils.isFunc(this.fNoAction))
	{
		this.fNoAction.call(null);
	}

	this.cancelCommand();
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

PopupsAskViewModel.prototype.onHide = function ()
{
};

PopupsAskViewModel.prototype.onBuild = function ()
{
	var self = this;
	$window.on('keydown', function (oEvent) {
		var bResult = true;
		if (oEvent && self.modalVisibility())
		{
			if (Enums.EventKeyCode.Tab === oEvent.keyCode || Enums.EventKeyCode.Right === oEvent.keyCode || Enums.EventKeyCode.Left === oEvent.keyCode)
			{
				if (self.yesFocus())
				{
					self.noFocus(true);
				}
				else
				{
					self.yesFocus(true);
				}

				bResult = false;
			}
		}

		return bResult;
	});
};

