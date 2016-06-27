
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Remote = require('Remote/Admin/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function PluginPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsPlugin');

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
			'placement': 'right',
			'trigger': 'hover',
//			'trigger': 'click',
			'title': Translator.i18n('POPUPS_PLUGIN/TOOLTIP_ABOUT_TITLE'),
			'container': 'body',
			'html': true,
			'content': function () {
				return '<pre>' + self.readme() + '</pre>';
//					.replace(/[\r]/g, '').replace(/[\n]/g, '<br />').replace(/[\t]/g, '&nbsp;&nbsp;&nbsp;');
			}
		};

		this.saveCommand = Utils.createCommand(this, function () {

			var list = {};

			list.Name = this.name();

			_.each(this.configures(), function (oItem) {

				var value = oItem.value();
				if (false === value || true === value)
				{
					value = value ? '1' : '0';
				}

				list['_' + oItem.Name] = value;

			}, this);

			this.saveError('');
			Remote.pluginSettingsUpdate(this.onPluginSettingsUpdateResponse, list);

		}, this.hasConfiguration);

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = Enums.KeyState.All;

		this.tryToClosePopup = _.debounce(_.bind(this.tryToClosePopup, this), 200);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Plugin', 'PopupsPluginViewModel'], PluginPopupView);
	_.extend(PluginPopupView.prototype, AbstractView.prototype);

	PluginPopupView.prototype.onPluginSettingsUpdateResponse = function (sResult, oData)
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
				this.saveError(Translator.getNotification(oData.ErrorCode));
			}
			else
			{
				this.saveError(Translator.getNotification(Enums.Notification.CantSavePluginSettings));
			}
		}
	};

	PluginPopupView.prototype.onShow = function (oPlugin)
	{
		this.name();
		this.readme();
		this.configures([]);

		if (oPlugin)
		{
			this.name(oPlugin.Name);
			this.readme(oPlugin.Readme);

			var aConfig = oPlugin.Config;
			if (Utils.isNonEmptyArray(aConfig))
			{
				this.configures(_.map(aConfig, function (aItem) {
					return {
						'value': ko.observable(aItem[0]),
						'placeholder': ko.observable(aItem[6]),
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

	PluginPopupView.prototype.tryToClosePopup = function ()
	{
		var
			self = this,
			PopupsAskViewModel = require('View/Popup/Ask')
		;

		if (!kn.isPopupVisible(PopupsAskViewModel))
		{
			kn.showScreenPopup(PopupsAskViewModel, [Translator.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
				if (self.modalVisibility())
				{
					Utils.delegateRun(self, 'cancelCommand');
				}
			}]);
		}
	};

	PluginPopupView.prototype.onBuild = function ()
	{
		key('esc', Enums.KeyState.All, _.bind(function () {
			if (this.modalVisibility())
			{
				this.tryToClosePopup();
			}
			return false;
		}, this));
	};

	module.exports = PluginPopupView;

}());
