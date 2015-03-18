
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

//		Enums = require('Common/Enums'),
//		Utils = require('Common/Utils'),
//
//		MessageHelper = require('Helper/Message'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 */
	function MessageStatesModel()
	{
		AbstractModel.call(this, 'MessageStatesModel');

		this.flags = {};
		this.states = {};

		this.flags.unseen = ko.observable(false);
		this.flags.deleted = ko.observable(false);
		this.flags.flagged = ko.observable(false);
		this.flags.answered = ko.observable(false);
		this.flags.forwarded = ko.observable(false);

		this.states.checked = ko.observable(false);
		this.states.deleted = ko.observable(false);
		this.states.selected = ko.observable(false);
		this.states.focused = ko.observable(false);

		this.states.showReadReceipt = ko.observable(false);
		this.states.showExternalImages = ko.observable(false);

		this.states.hasUnseenSubMessages = ko.observable(false);
		this.states.hasFlaggedSubMessages = ko.observable(false);

		this.threads = ko.observableArray([]);
	}

	_.extend(MessageStatesModel.prototype, AbstractModel.prototype);

	MessageStatesModel.prototype.flags = {};
	MessageStatesModel.prototype.states = {};

	MessageStatesModel.prototype.clear = function ()
	{
		this.flags.unseen(false);
		this.flags.deleted(false);
		this.flags.flagged(false);
		this.flags.answered(false);
		this.flags.forwarded(false);

		this.threads([]);
	};

	module.exports = MessageStatesModel;

}());