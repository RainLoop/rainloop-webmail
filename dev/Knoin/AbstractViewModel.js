/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {string=} sPosition = ''
 * @param {string=} sTemplate = ''
 * @constructor
 */
function KnoinAbstractViewModel(sPosition, sTemplate)
{
	this.sPosition = Utils.pString(sPosition);
	this.sTemplate = Utils.pString(sTemplate);

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
