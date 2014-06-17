/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function FilterConditionModel(oKoList, oKoCanBeDeleted)
{
	this.parentList = oKoList;
	this.canBeDeleted = oKoCanBeDeleted;

	this.field = ko.observable(Enums.FilterConditionField.Subject);
	this.fieldOptions = [ // TODO i18n
		{'id': Enums.FilterConditionField.Subject, 'name': 'Subject'},
		{'id': Enums.FilterConditionField.Recipient, 'name': 'Recipient (To or CC)'},
		{'id': Enums.FilterConditionField.From, 'name': 'From'},
		{'id': Enums.FilterConditionField.To, 'name': 'To'}
	];

	this.type = ko.observable(Enums.FilterConditionType.Contains);
	this.typeOptions = [ // TODO i18n
		{'id': Enums.FilterConditionType.Contains, 'name': 'Contains'},
		{'id': Enums.FilterConditionType.NotContains, 'name': 'Not Contains'},
		{'id': Enums.FilterConditionType.EqualTo, 'name': 'Equal To'},
		{'id': Enums.FilterConditionType.NotEqualTo, 'name': 'Not Equal To'}
	];

	this.value = ko.observable('');

	this.template = ko.computed(function () {

		var sTemplate = '';
		switch (this.type())
		{
			default:
				sTemplate = 'SettingsFiltersConditionDefault';
				break;
		}

		return sTemplate;

	}, this);
}

FilterConditionModel.prototype.removeSelf = function ()
{
	if (this.canBeDeleted())
	{
		this.parentList.remove(this);
	}
};
