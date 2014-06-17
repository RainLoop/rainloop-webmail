/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function FilterModel()
{
	this.enabled = ko.observable(true);

	this.name = ko.observable('');

	this.conditionsType = ko.observable(Enums.FilterRulesType.And);

	this.conditions = ko.observableArray([]);
	this.actions = ko.observableArray([]);

	this.conditions.subscribe(function () {
		Utils.windowResize();
	});

	this.actions.subscribe(function () {
		Utils.windowResize();
	});

	this.conditionsCanBeDeleted = ko.computed(function () {
		return 1 < this.conditions().length;
	}, this);

	this.actionsCanBeDeleted = ko.computed(function () {
		return 1 < this.actions().length;
	}, this);
}

FilterModel.prototype.addCondition = function ()
{
	this.conditions.push(new FilterConditionModel(this.conditions, this.conditionsCanBeDeleted));
};

FilterModel.prototype.addAction = function ()
{
	this.actions.push(new FilterActionModel(this.actions, this.actionsCanBeDeleted));
};

FilterModel.prototype.parse = function (oItem)
{
	var bResult = false;
	if (oItem && 'Object/Filter' === oItem['@Object'])
	{
		this.name(Utils.pString(oItem['Name']));

		bResult = true;
	}

	return bResult;
};
