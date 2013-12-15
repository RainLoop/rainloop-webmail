/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {number=} iType = Enums.ContactPropertyType.Unknown
 * @param {string=} sValue = ''
 * @param {boolean=} bFocused = false
 *
 * @constructor
 */
function ContactPropertyModel(iType, sValue, bFocused)
{
	this.type = ko.observable(Utils.isUnd(iType) ? Enums.ContactPropertyType.Unknown : iType);
	this.focused = ko.observable(Utils.isUnd(bFocused) ? false : !!bFocused);
	this.value = ko.observable(Utils.pString(sValue));
}
