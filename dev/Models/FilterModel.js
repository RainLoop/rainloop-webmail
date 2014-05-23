/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function FilterModel()
{
	this.enabled = ko.observable(true);

	this.conditions = ko.observableArray([]);

	this.action = ko.observable(Enums.FiltersAction.None);
}

FilterModel.prototype.deleteCondition = function (oCondition)
{
	this.conditions.remove(oCondition);
};

FilterModel.prototype.addCondition = function ()
{
	this.conditions.push(new FilterConditionModel());
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
