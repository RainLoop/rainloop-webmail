/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {string=} sPosition = ''
 * @param {string=} sTemplate = ''
 * @constructor
 */
function KnoinAbstractViewModel(sPosition, sTemplate)
{
	this.bDisabeCloseOnEsc = false;
	this.sPosition = Utils.pString(sPosition);
	this.sTemplate = Utils.pString(sTemplate);

	this.sDefaultKeyScope = Enums.KeyState.None;
	this.sCurrentKeyScope = this.sDefaultKeyScope;

	this.viewModelName = '';
	this.viewModelVisibility = ko.observable(false);
	if ('Popups' === this.sPosition)
	{
		this.modalVisibility = ko.observable(false);
	}

	this.viewModelDom = null;
}

/**
 * @type {string}
 */
KnoinAbstractViewModel.prototype.sPosition = '';

/**
 * @type {string}
 */
KnoinAbstractViewModel.prototype.sTemplate = '';

/**
 * @type {string}
 */
KnoinAbstractViewModel.prototype.viewModelName = '';

/**
 * @type {?}
 */
KnoinAbstractViewModel.prototype.viewModelDom = null;

/**
 * @return {string}
 */
KnoinAbstractViewModel.prototype.viewModelTemplate = function ()
{
	return this.sTemplate;
};

/**
 * @return {string}
 */
KnoinAbstractViewModel.prototype.viewModelPosition = function ()
{
	return this.sPosition;
};

KnoinAbstractViewModel.prototype.cancelCommand = KnoinAbstractViewModel.prototype.closeCommand = function ()
{
};

KnoinAbstractViewModel.prototype.storeAndSetKeyScope = function ()
{
	this.sCurrentKeyScope = RL.data().keyScope();
	RL.data().keyScope(this.sDefaultKeyScope);
};

KnoinAbstractViewModel.prototype.restoreKeyScope = function ()
{
	RL.data().keyScope(this.sCurrentKeyScope);
};

KnoinAbstractViewModel.prototype.registerPopupEscapeKey = function ()
{
	var self = this;
	$window.on('keydown', function (oEvent) {
		if (oEvent && Enums.EventKeyCode.Esc === oEvent.keyCode && self.modalVisibility && self.modalVisibility())
		{
			Utils.delegateRun(self, 'cancelCommand');
			return false;
		}

		return true;
	});
};
