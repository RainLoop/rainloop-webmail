/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsLanguagesViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsLanguages');

	this.exp = ko.observable(false);

	this.languages = ko.computed(function () {
		var sCurrent = RL.data().mainLanguage();
		return _.map(RL.data().languages(), function (sLanguage) {
			return {
				'key': sLanguage,
				'selected': sLanguage === sCurrent,
				'fullName': Utils.convertLangName(sLanguage)
			};
		});
	});
}

Utils.extendAsViewModel('PopupsLanguagesViewModel', PopupsLanguagesViewModel);

PopupsLanguagesViewModel.prototype.onShow = function ()
{
//	var self = this;
//	_.defer(function () {
//		self.exp(true);
//	});
	this.exp(true);
};

PopupsLanguagesViewModel.prototype.onHide = function ()
{
	this.exp(false);
};

PopupsLanguagesViewModel.prototype.changeLanguage = function (sLang)
{
	RL.data().mainLanguage(sLang);
	this.cancelCommand();
};
