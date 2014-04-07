/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsPluginViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsPlugin');

	var self = this;
	
	this.onPluginSettingsUpdateResponse = _.bind(this.onPluginSettingsUpdateResponse, this);
	
	this.saveError = ko.observable('');
	
	this.name = ko.observable('');
	this.readme = ko.observable('');
	
	this.configures = ko.observableArray([]);

	this.hasReadme = ko.computed(function () {
		return '' !== this.readme();
	}, this);
	
	this.hasConfiguration = ko.computed(function () {
		return 0 < this.configures().length;
	}, this);

	this.readmePopoverConf = {
		'placement': 'top',
		'trigger': 'hover',
		'title': 'About',
		'content': function () {
			return self.readme();
		}
	};
	
	this.saveCommand = Utils.createCommand(this, function () {
		
		var oList = {};
		
		oList['Name'] = this.name();
		
		_.each(this.configures(), function (oItem) {
			
			var mValue = oItem.value();
			if (false === mValue || true === mValue)
			{
				mValue = mValue ? '1' : '0';
			}
			
			oList['_' + oItem['Name']] = mValue;
			
		}, this);
		
		this.saveError('');
		RL.remote().pluginSettingsUpdate(this.onPluginSettingsUpdateResponse, oList);
		
	}, this.hasConfiguration);

	this.bDisabeCloseOnEsc = true;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsPluginViewModel', PopupsPluginViewModel);

PopupsPluginViewModel.prototype.onPluginSettingsUpdateResponse = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.cancelCommand();
	}
	else
	{
		this.saveError('');
		if (oData && oData.ErrorCode)
		{
			this.saveError(Utils.getNotification(oData.ErrorCode));
		}
		else
		{
			this.saveError(Utils.getNotification(Enums.Notification.CantSavePluginSettings));
		}
	}
};

PopupsPluginViewModel.prototype.onShow = function (oPlugin)
{
	this.name();
	this.readme();
	this.configures([]);
	
	if (oPlugin)
	{
		this.name(oPlugin['Name']);
		this.readme(oPlugin['Readme']);
		
		var aConfig = oPlugin['Config'];
		if (Utils.isNonEmptyArray(aConfig))
		{
			this.configures(_.map(aConfig, function (aItem) {
				return {
					'value': ko.observable(aItem[0]),
					'Name': aItem[1],
					'Type': aItem[2],
					'Label': aItem[3],
					'Default': aItem[4],
					'Desc': aItem[5]
				};
			}));
		}
	}
};

PopupsPluginViewModel.prototype.tryToClosePopup = function ()
{
	var self = this;
	kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
		if (self.modalVisibility())
		{
			Utils.delegateRun(self, 'cancelCommand');
		}
	}]);
};

PopupsPluginViewModel.prototype.onBuild = function ()
{
	key('esc', _.bind(function () {
		if (this.modalVisibility())
		{
			this.tryToClosePopup();
			return false;
		}
	}));
};
