
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),

		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		LinkBuilder = require('Common/LinkBuilder'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 */
	function AttachmentModel()
	{
		AbstractModel.call(this, 'AttachmentModel');

		this.mimeType = '';
		this.fileName = '';
		this.estimatedSize = 0;
		this.friendlySize = '';
		this.isInline = false;
		this.isLinked = false;
		this.cid = '';
		this.cidWithOutTags = '';
		this.contentLocation = '';
		this.download = '';
		this.folder = '';
		this.uid = '';
		this.mimeIndex = '';
	}

	_.extend(AttachmentModel.prototype, AbstractModel.prototype);

	/**
	 * @static
	 * @param {AjaxJsonAttachment} oJsonAttachment
	 * @return {?AttachmentModel}
	 */
	AttachmentModel.newInstanceFromJson = function (oJsonAttachment)
	{
		var oAttachmentModel = new AttachmentModel();
		return oAttachmentModel.initByJson(oJsonAttachment) ? oAttachmentModel : null;
	};

	AttachmentModel.prototype.mimeType = '';
	AttachmentModel.prototype.fileName = '';
	AttachmentModel.prototype.estimatedSize = 0;
	AttachmentModel.prototype.friendlySize = '';
	AttachmentModel.prototype.isInline = false;
	AttachmentModel.prototype.isLinked = false;
	AttachmentModel.prototype.cid = '';
	AttachmentModel.prototype.cidWithOutTags = '';
	AttachmentModel.prototype.contentLocation = '';
	AttachmentModel.prototype.download = '';
	AttachmentModel.prototype.folder = '';
	AttachmentModel.prototype.uid = '';
	AttachmentModel.prototype.mimeIndex = '';

	/**
	 * @param {AjaxJsonAttachment} oJsonAttachment
	 */
	AttachmentModel.prototype.initByJson = function (oJsonAttachment)
	{
		var bResult = false;
		if (oJsonAttachment && 'Object/Attachment' === oJsonAttachment['@Object'])
		{
			this.mimeType = (oJsonAttachment.MimeType || '').toLowerCase();
			this.fileName = oJsonAttachment.FileName;
			this.estimatedSize = Utils.pInt(oJsonAttachment.EstimatedSize);
			this.isInline = !!oJsonAttachment.IsInline;
			this.isLinked = !!oJsonAttachment.IsLinked;
			this.cid = oJsonAttachment.CID;
			this.contentLocation = oJsonAttachment.ContentLocation;
			this.download = oJsonAttachment.Download;

			this.folder = oJsonAttachment.Folder;
			this.uid = oJsonAttachment.Uid;
			this.mimeIndex = oJsonAttachment.MimeIndex;

			this.friendlySize = Utils.friendlySize(this.estimatedSize);
			this.cidWithOutTags = this.cid.replace(/^<+/, '').replace(/>+$/, '');

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isImage = function ()
	{
		return -1 < Utils.inArray(this.mimeType.toLowerCase(),
			['image/png', 'image/jpg', 'image/jpeg', 'image/gif']
		);
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isText = function ()
	{
		return 'text/' === this.mimeType.substr(0, 5) &&
			-1 === Utils.inArray(this.mimeType, ['text/html']);
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isPdf = function ()
	{
		return Globals.bAllowPdfPreview && 'application/pdf' === this.mimeType;
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkDownload = function ()
	{
		return LinkBuilder.attachmentDownload(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkPreview = function ()
	{
		return LinkBuilder.attachmentPreview(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkPreviewAsPlain = function ()
	{
		return LinkBuilder.attachmentPreviewAsPlain(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.generateTransferDownloadUrl = function ()
	{
		var	sLink = this.linkDownload();
		if ('http' !== sLink.substr(0, 4))
		{
			sLink = window.location.protocol + '//' + window.location.host + window.location.pathname + sLink;
		}

		return this.mimeType + ':' + this.fileName + ':' + sLink;
	};

	/**
	 * @param {AttachmentModel} oAttachment
	 * @param {*} oEvent
	 * @return {boolean}
	 */
	AttachmentModel.prototype.eventDragStart = function (oAttachment, oEvent)
	{
		var	oLocalEvent = oEvent.originalEvent || oEvent;
		if (oAttachment && oLocalEvent && oLocalEvent.dataTransfer && oLocalEvent.dataTransfer.setData)
		{
			oLocalEvent.dataTransfer.setData('DownloadURL', this.generateTransferDownloadUrl());
		}

		return true;
	};

	AttachmentModel.prototype.iconClass = function ()
	{
		var
			aParts = this.mimeType.toLocaleString().split('/'),
			sClass = 'icon-file'
		;

		if (aParts && aParts[1])
		{
			if ('image' === aParts[0])
			{
				sClass = 'icon-file-image';
			}
			else if ('text' === aParts[0])
			{
				sClass = 'icon-file-text';
			}
			else if ('audio' === aParts[0])
			{
				sClass = 'icon-file-music';
			}
			else if ('video' === aParts[0])
			{
				sClass = 'icon-file-movie';
			}
			else if (-1 < Utils.inArray(aParts[1],
				['zip', '7z', 'tar', 'rar', 'gzip', 'bzip', 'bzip2', 'x-zip', 'x-7z', 'x-rar', 'x-tar', 'x-gzip', 'x-bzip', 'x-bzip2', 'x-zip-compressed', 'x-7z-compressed', 'x-rar-compressed']))
			{
				sClass = 'icon-file-zip';
			}
	//		else if (-1 < Utils.inArray(aParts[1],
	//			['pdf', 'x-pdf']))
	//		{
	//			sClass = 'icon-file-pdf';
	//		}
	//		else if (-1 < Utils.inArray(aParts[1], [
	//			'exe', 'x-exe', 'x-winexe', 'bat'
	//		]))
	//		{
	//			sClass = 'icon-console';
	//		}
			else if (-1 < Utils.inArray(aParts[1], [
				'rtf', 'msword', 'vnd.msword', 'vnd.openxmlformats-officedocument.wordprocessingml.document',
				'vnd.openxmlformats-officedocument.wordprocessingml.template',
				'vnd.ms-word.document.macroEnabled.12',
				'vnd.ms-word.template.macroEnabled.12'
			]))
			{
				sClass = 'icon-file-text';
			}
			else if (-1 < Utils.inArray(aParts[1], [
				'excel', 'ms-excel', 'vnd.ms-excel',
				'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'vnd.openxmlformats-officedocument.spreadsheetml.template',
				'vnd.ms-excel.sheet.macroEnabled.12',
				'vnd.ms-excel.template.macroEnabled.12',
				'vnd.ms-excel.addin.macroEnabled.12',
				'vnd.ms-excel.sheet.binary.macroEnabled.12'
			]))
			{
				sClass = 'icon-file-excel';
			}
			else if (-1 < Utils.inArray(aParts[1], [
				'powerpoint', 'ms-powerpoint', 'vnd.ms-powerpoint',
				'vnd.openxmlformats-officedocument.presentationml.presentation',
				'vnd.openxmlformats-officedocument.presentationml.template',
				'vnd.openxmlformats-officedocument.presentationml.slideshow',
				'vnd.ms-powerpoint.addin.macroEnabled.12',
				'vnd.ms-powerpoint.presentation.macroEnabled.12',
				'vnd.ms-powerpoint.template.macroEnabled.12',
				'vnd.ms-powerpoint.slideshow.macroEnabled.12'
			]))
			{
				sClass = 'icon-file-chart-graph';
			}
		}

		return sClass;
	};

	module.exports = AttachmentModel;

}());