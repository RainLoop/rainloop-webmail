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
		return _.map(RL.data().languages(), function (sLanguage) {
			return {
				'key': sLanguage,
				'selected': ko.observable(false),
				'fullName': Utils.convertLangName(sLanguage)
			};
		});
	});

	RL.data().mainLanguage.subscribe(function () {
		this.resetMainLanguage();
	}, this);
}

Utils.extendAsViewModel('PopupsLanguagesViewModel', PopupsLanguagesViewModel);

PopupsLanguagesViewModel.prototype.languageEnName = function (sLanguage)
{
	return Utils.convertLangName(sLanguage, true);
};

PopupsLanguagesViewModel.prototype.resetMainLanguage = function ()
{
	var sCurrent = RL.data().mainLanguage();
	_.each(this.languages(), function (oItem) {
		oItem['selected'](oItem['key'] === sCurrent);
	});
};

PopupsLanguagesViewModel.prototype.onShow = function ()
{
	this.exp(true);

	this.resetMainLanguage();
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
