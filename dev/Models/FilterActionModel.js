/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function FilterActionModel(oKoList, oKoCanBeDeleted)
{
	this.parentList = oKoList;
	this.canBeDeleted = oKoCanBeDeleted;

	this.value = ko.observable('');

	this.type = ko.observable(Enums.FiltersAction.Move);
	this.typeOptions = [ // TODO i18n
		{'id': Enums.FiltersAction.Move, 'name': 'Move to'},
		{'id': Enums.FiltersAction.Forward, 'name': 'Forward to'},
		{'id': Enums.FiltersAction.Delete, 'name': 'Discard'},
		{'id': Enums.FiltersAction.MarkAsRead, 'name': 'Mark as read'}
	];

	this.template = ko.computed(function () {

		var sTemplate = '';
		switch (this.type())
		{
			default:
			case Enums.FiltersAction.Move:
				sTemplate = 'SettingsFiltersActionValueAsFolders';
				break;
			case Enums.FiltersAction.Forward:
				sTemplate = 'SettingsFiltersActionWithValue';
				break;
			case Enums.FiltersAction.MarkAsRead:
			case Enums.FiltersAction.Delete:
				sTemplate = 'SettingsFiltersActionNoValue';
				break;
		}

		return sTemplate;

	}, this);
}

FilterActionModel.prototype.removeSelf = function ()
{
	if (this.canBeDeleted())
	{
		this.parentList.remove(this);
	}
};