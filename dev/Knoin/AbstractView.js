
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Globals = require('Common/Globals')
	;

	/**
	 * @constructor
	 * @param {string=} sPosition = ''
	 * @param {string=} sTemplate = ''
	 */
	function AbstractView(sPosition, sTemplate)
	{
		this.bDisabeCloseOnEsc = false;
		this.sPosition = Utils.pString(sPosition);
		this.sTemplate = Utils.pString(sTemplate);

		this.sDefaultKeyScope = Enums.KeyState.None;
		this.sCurrentKeyScope = this.sDefaultKeyScope;

		this.viewModelVisibility = ko.observable(false);
		this.modalVisibility = ko.observable(false).extend({'rateLimit': 0});

		this.viewModelName = '';
		this.viewModelNames = [];
		this.viewModelDom = null;
	}

	/**
	 * @type {boolean}
	 */
	AbstractView.prototype.bDisabeCloseOnEsc = false;

	/**
	 * @type {string}
	 */
	AbstractView.prototype.sPosition = '';

	/**
	 * @type {string}
	 */
	AbstractView.prototype.sTemplate = '';

	/**
	 * @type {string}
	 */
	AbstractView.prototype.sDefaultKeyScope = Enums.KeyState.None;

	/**
	 * @type {string}
	 */
	AbstractView.prototype.sCurrentKeyScope = Enums.KeyState.None;

	/**
	 * @type {string}
	 */
	AbstractView.prototype.viewModelName = '';

	/**
	 * @type {Array}
	 */
	AbstractView.prototype.viewModelNames = [];

	/**
	 * @type {?}
	 */
	AbstractView.prototype.viewModelDom = null;

	/**
	 * @return {string}
	 */
	AbstractView.prototype.viewModelTemplate = function ()
	{
		return this.sTemplate;
	};

	/**
	 * @return {string}
	 */
	AbstractView.prototype.viewModelPosition = function ()
	{
		return this.sPosition;
	};

	AbstractView.prototype.cancelCommand = function () {};
	AbstractView.prototype.closeCommand = function () {};

	AbstractView.prototype.storeAndSetKeyScope = function ()
	{
		this.sCurrentKeyScope = Globals.keyScope();
		Globals.keyScope(this.sDefaultKeyScope);
	};

	AbstractView.prototype.restoreKeyScope = function ()
	{
		Globals.keyScope(this.sCurrentKeyScope);
	};

	AbstractView.prototype.registerPopupKeyDown = function ()
	{
		var self = this;

		Globals.$win.on('keydown', function (oEvent) {
			if (oEvent && self.modalVisibility && self.modalVisibility())
			{
				if (!this.bDisabeCloseOnEsc && Enums.EventKeyCode.Esc === oEvent.keyCode)
				{
					Utils.delegateRun(self, 'cancelCommand');
					return false;
				}
				else if (Enums.EventKeyCode.Backspace === oEvent.keyCode && !Utils.inFocus())
				{
					return false;
				}
			}

			return true;
		});
	};

	module.exports = AbstractView;

}());
