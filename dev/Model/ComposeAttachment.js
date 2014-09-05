
(function () {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Common/Utils')
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
		this.id = sId;
		this.isInline = Utils.isUnd(bInline) ? false : !!bInline;
		this.isLinked = Utils.isUnd(bLinked) ? false : !!bLinked;
		this.CID = Utils.isUnd(sCID) ? '' : sCID;
		this.contentLocation = Utils.isUnd(sContentLocation) ? '' : sContentLocation;
		this.fromMessage = false;

		this.fileName = ko.observable(sFileName);
		this.size = ko.observable(Utils.isUnd(nSize) ? null : nSize);
		this.tempName = ko.observable('');

		this.progress = ko.observable('');
		this.error = ko.observable('');
		this.waiting = ko.observable(true);
		this.uploading = ko.observable(false);
		this.enabled = ko.observable(true);

		this.friendlySize = ko.computed(function () {
			var mSize = this.size();
			return null === mSize ? '' : Utils.friendlySize(this.size());
		}, this);
	}

	ComposeAttachmentModel.prototype.id = '';
	ComposeAttachmentModel.prototype.isInline = false;
	ComposeAttachmentModel.prototype.isLinked = false;
	ComposeAttachmentModel.prototype.CID = '';
	ComposeAttachmentModel.prototype.contentLocation = '';
	ComposeAttachmentModel.prototype.fromMessage = false;
	ComposeAttachmentModel.prototype.cancel = Utils.emptyFunction;

	/**
	 * @param {AjaxJsonComposeAttachment} oJsonAttachment
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

	module.exports = ComposeAttachmentModel;

}());