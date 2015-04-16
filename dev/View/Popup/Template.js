
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),
		HtmlEditor = require('Common/HtmlEditor'),

		Remote = require('Remote/User/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function TemplatePopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsTemplate');

		this.editor = null;
		this.signatureDom = ko.observable(null);

		this.id = ko.observable('');

		this.name = ko.observable('');
		this.name.error = ko.observable(false);
		this.name.focus = ko.observable(false);

		this.body = ko.observable('');
		this.body.loading = ko.observable(false);
		this.body.error = ko.observable(false);

		this.name.subscribe(function () {
			this.name.error(false);
		}, this);

		this.body.subscribe(function () {
			this.body.error(false);
		}, this);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.addTemplateCommand = Utils.createCommand(this, function () {

			this.populateBodyFromEditor();

			this.name.error('' === Utils.trim(this.name()));
			this.body.error('' === Utils.trim(this.body()) ||
				':HTML:' === Utils.trim(this.body()));

			if (this.name.error() || this.body.error())
			{
				return false;
			}

			this.submitRequest(true);

			Remote.templateSetup(_.bind(function (sResult, oData) {

				this.submitRequest(false);
				if (Enums.StorageResultType.Success === sResult && oData)
				{
					if (oData.Result)
					{
						require('App/User').templates();
						this.cancelCommand();
					}
					else if (oData.ErrorCode)
					{
						this.submitError(Translator.getNotification(oData.ErrorCode));
					}
				}
				else
				{
					this.submitError(Translator.getNotification(Enums.Notification.UnknownError));
				}

			}, this), this.id(), this.name(), this.body());

			return true;

		}, function () {
			return !this.submitRequest();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Template'], TemplatePopupView);
	_.extend(TemplatePopupView.prototype, AbstractView.prototype);

	TemplatePopupView.prototype.clearPopup = function ()
	{
		this.id('');

		this.name('');
		this.name.error(false);

		this.body('');
		this.body.loading(false);
		this.body.error(false);

		this.submitRequest(false);
		this.submitError('');

		if (this.editor)
		{
			this.editor.setPlain('', false);
		}
	};

	TemplatePopupView.prototype.populateBodyFromEditor = function ()
	{
		if (this.editor)
		{
			this.body(this.editor.getDataWithHtmlMark());
		}
	};

	TemplatePopupView.prototype.editorSetBody = function (sBody)
	{
		if (!this.editor && this.signatureDom())
		{
			var self = this;
			this.editor = new HtmlEditor(self.signatureDom(), function () {
				self.populateBodyFromEditor();
			}, function () {
				self.editor.setHtmlOrPlain(sBody);
			});
		}
		else
		{
			this.editor.setHtmlOrPlain(sBody);
		}
	};

	TemplatePopupView.prototype.onShow = function (oTemplate)
	{
		var self = this;

		this.clearPopup();

		if (oTemplate && oTemplate.id)
		{
			this.id(oTemplate.id);
			this.name(oTemplate.name);
			this.body(oTemplate.body);

			if (oTemplate.populated)
			{
				self.editorSetBody(this.body());
			}
			else
			{
				this.body.loading(true);
				self.body.error(false);

				Remote.templateGetById(function (sResult, oData) {

					self.body.loading(false);

					if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
						'Object/Template' === oData.Result['@Object'] && Utils.isNormal(oData.Result['Body']))
					{
						oTemplate.body = oData.Result['Body'];
						oTemplate.populated = true;

						self.body(oTemplate.body);
						self.body.error(false);
					}
					else
					{
						self.body('');
						self.body.error(true);
					}

					self.editorSetBody(self.body());

				}, this.id());
			}
		}
		else
		{
			self.editorSetBody('');
		}
	};

	TemplatePopupView.prototype.onShowWithDelay = function ()
	{
		this.name.focus(true);
	};

	module.exports = TemplatePopupView;

}());