
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		AttachmentModel = require('Model/Attachment'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 * @param {string} sId
	 * @param {string} sFileName
	 * @param {?number=} nSize
	 * @param {boolean=} bInline
	 * @param {boolean=} bLinked
	 * @param {string=} sCID
	 * @param {string=} sContentLocation
	 */
	function ComposeAttachmentModel(sId, sFileName, nSize, bInline, bLinked, sCID, sContentLocation)
	{
		AbstractModel.call(this, 'ComposeAttachmentModel');

		this.id = sId;
		this.isInline = Utils.isUnd(bInline) ? false : !!bInline;
		this.isLinked = Utils.isUnd(bLinked) ? false : !!bLinked;
		this.CID = Utils.isUnd(sCID) ? '' : sCID;
		this.contentLocation = Utils.isUnd(sContentLocation) ? '' : sContentLocation;
		this.fromMessage = false;

		this.fileName = ko.observable(sFileName);
		this.size = ko.observable(Utils.isUnd(nSize) ? null : nSize);
		this.tempName = ko.observable('');

		this.progress = ko.observable(0);
		this.error = ko.observable('');
		this.waiting = ko.observable(true);
		this.uploading = ko.observable(false);
		this.enabled = ko.observable(true);
		this.complete = ko.observable(false);

		this.progressText = ko.computed(function () {
			var iP = this.progress();
			return 0 === iP ? '' : '' + (98 < iP ? 100 : iP) + '%';
		}, this);

		this.progressStyle = ko.computed(function () {
			var iP = this.progress();
			return 0 === iP ? '' : 'width:' + (98 < iP ? 100 : iP) + '%';
		}, this);

		this.title = ko.computed(function () {
			var sError = this.error();
			return '' !== sError ? sError : this.fileName();
		}, this);

		this.friendlySize = ko.computed(function () {
			var mSize = this.size();
			return null === mSize ? '' : Utils.friendlySize(this.size());
		}, this);

		this.mimeType = ko.computed(function () {
			return Utils.mimeContentType(this.fileName());
		}, this);

		this.fileExt = ko.computed(function () {
			return Utils.getFileExtension(this.fileName());
		}, this);

		this.regDisposables([this.progressText, this.progressStyle, this.title, this.friendlySize, this.mimeType, this.fileExt]);
	}

	_.extend(ComposeAttachmentModel.prototype, AbstractModel.prototype);

	ComposeAttachmentModel.prototype.id = '';
	ComposeAttachmentModel.prototype.isInline = false;
	ComposeAttachmentModel.prototype.isLinked = false;
	ComposeAttachmentModel.prototype.CID = '';
	ComposeAttachmentModel.prototype.contentLocation = '';
	ComposeAttachmentModel.prototype.fromMessage = false;
	ComposeAttachmentModel.prototype.cancel = Utils.emptyFunction;

	/**
	 * @param {AjaxJsonComposeAttachment} oJsonAttachment
	 * @return {boolean}
	 */
	ComposeAttachmentModel.prototype.initByUploadJson = function (oJsonAttachment)
	{
		var bResult = false;
		if (oJsonAttachment)
		{
			this.fileName(oJsonAttachment.Name);
			this.size(Utils.isUnd(oJsonAttachment.Size) ? 0 : Utils.pInt(oJsonAttachment.Size));
			this.tempName(Utils.isUnd(oJsonAttachment.TempName) ? '' : oJsonAttachment.TempName);
			this.isInline = false;

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @return {string}
	 */
	ComposeAttachmentModel.prototype.iconClass = function ()
	{
		return AttachmentModel.staticIconClass(
			AttachmentModel.staticFileType(this.fileExt(), this.mimeType()))[0];
	};

	/**
	 * @return {string}
	 */
	ComposeAttachmentModel.prototype.iconText = function ()
	{
		return AttachmentModel.staticIconClass(
			AttachmentModel.staticFileType(this.fileExt(), this.mimeType()))[1];
	};

	module.exports = ComposeAttachmentModel;

}());