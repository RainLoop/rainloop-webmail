/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsPgpKey()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsPgpKey');

	this.key = ko.observable('');
	this.passphrase = ko.observable('');

	this.bPrivate = null;
	this.fCallback = null;

	// commands
	this.sendPgp = Utils.createCommand(this, function () {

		var sKey = Utils.trim(this.key());
		if (this.fCallback && sKey)
		{
			this.fCallback(this.passphrase(), sKey);
		}

		this.cancelCommand();
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsPgpKey', PopupsPgpKey);

PopupsPgpKey.prototype.clearPopup = function ()
{
//	this.key('');
//	this.passphrase('');

	this.bPrivate = null;
	this.fCallback = null;
};

PopupsPgpKey.prototype.onBuild = function ()
{
	var self = this;
	$window.on('keydown', function (oEvent) {
		var bResult = true;
		if (oEvent && self.modalVisibility() && Enums.EventKeyCode.Esc === oEvent.keyCode)
		{
			Utils.delegateRun(self, 'closeCommand');
			bResult = false;
		}

		return bResult;
	});
};

PopupsPgpKey.prototype.onShow = function (bPrivate, fCallback)
{
	this.clearPopup();

	this.bPrivate = bPrivate;
	this.fCallback = fCallback;
};
