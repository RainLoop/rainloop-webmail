/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function FilterConditionModel(oKoList)
{
	this.parentList = oKoList;

	this.field = ko.observable(Enums.FilterConditionField.From);

	this.fieldOptions = [ // TODO i18n
		{'id': Enums.FilterConditionField.From, 'name': 'From'},
		{'id': Enums.FilterConditionField.Recipient, 'name': 'Recipient (To or CC)'},
		{'id': Enums.FilterConditionField.To, 'name': 'To'},
		{'id': Enums.FilterConditionField.Subject, 'name': 'Subject'}
	];

	this.type = ko.observable(Enums.FilterConditionType.EqualTo);
	
	this.typeOptions = [ // TODO i18n
		{'id': Enums.FilterConditionType.EqualTo, 'name': 'Equal To'},
		{'id': Enums.FilterConditionType.NotEqualTo, 'name': 'Not Equal To'},
		{'id': Enums.FilterConditionType.Contains, 'name': 'Contains'},
		{'id': Enums.FilterConditionType.NotContains, 'name': 'Not Contains'}
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
	this.parentList.remove(this);
};
