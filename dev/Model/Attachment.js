
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Audio = require('Common/Audio'),

		AbstractModel = require('Knoin/AbstractModel')
	;

	/**
	 * @constructor
	 */
	function AttachmentModel()
	{
		AbstractModel.call(this, 'AttachmentModel');

		this.checked = ko.observable(false);

		this.mimeType = '';
		this.fileName = '';
		this.fileNameExt = '';
		this.fileType = Enums.FileType.Unknown;
		this.estimatedSize = 0;
		this.friendlySize = '';
		this.isInline = false;
		this.isLinked = false;
		this.isThumbnail = false;
		this.cid = '';
		this.cidWithOutTags = '';
		this.contentLocation = '';
		this.download = '';
		this.folder = '';
		this.uid = '';
		this.mimeIndex = '';
		this.framed = false;
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
	AttachmentModel.prototype.fileType = '';
	AttachmentModel.prototype.fileNameExt = '';
	AttachmentModel.prototype.estimatedSize = 0;
	AttachmentModel.prototype.friendlySize = '';
	AttachmentModel.prototype.isInline = false;
	AttachmentModel.prototype.isLinked = false;
	AttachmentModel.prototype.isThumbnail = false;
	AttachmentModel.prototype.cid = '';
	AttachmentModel.prototype.cidWithOutTags = '';
	AttachmentModel.prototype.contentLocation = '';
	AttachmentModel.prototype.download = '';
	AttachmentModel.prototype.folder = '';
	AttachmentModel.prototype.uid = '';
	AttachmentModel.prototype.mimeIndex = '';
	AttachmentModel.prototype.framed = false;

	/**
	 * @param {AjaxJsonAttachment} oJsonAttachment
	 */
	AttachmentModel.prototype.initByJson = function (oJsonAttachment)
	{
		var bResult = false;
		if (oJsonAttachment && 'Object/Attachment' === oJsonAttachment['@Object'])
		{
			this.mimeType = Utils.trim((oJsonAttachment.MimeType || '').toLowerCase());
			this.fileName = Utils.trim(oJsonAttachment.FileName);
			this.estimatedSize = Utils.pInt(oJsonAttachment.EstimatedSize);
			this.isInline = !!oJsonAttachment.IsInline;
			this.isLinked = !!oJsonAttachment.IsLinked;
			this.isThumbnail = !!oJsonAttachment.IsThumbnail;
			this.cid = oJsonAttachment.CID;
			this.contentLocation = oJsonAttachment.ContentLocation;
			this.download = oJsonAttachment.Download;

			this.folder = oJsonAttachment.Folder;
			this.uid = oJsonAttachment.Uid;
			this.mimeIndex = oJsonAttachment.MimeIndex;
			this.framed = !!oJsonAttachment.Framed;

			this.friendlySize = Utils.friendlySize(this.estimatedSize);
			this.cidWithOutTags = this.cid.replace(/^<+/, '').replace(/>+$/, '');

			this.fileNameExt = Utils.getFileExtension(this.fileName);
			this.fileType = AttachmentModel.staticFileType(this.fileNameExt, this.mimeType);

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isImage = function ()
	{
		return Enums.FileType.Image === this.fileType;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isMp3 = function ()
	{
		return Enums.FileType.Audio === this.fileType &&
			'mp3' === this.fileNameExt;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isOgg = function ()
	{
		return Enums.FileType.Audio === this.fileType &&
			('oga' === this.fileNameExt || 'ogg' === this.fileNameExt);
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isWav = function ()
	{
		return Enums.FileType.Audio === this.fileType &&
			'wav' === this.fileNameExt;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.hasThumbnail = function ()
	{
		return this.isThumbnail;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isText = function ()
	{
		return Enums.FileType.Text === this.fileType ||
			Enums.FileType.Eml === this.fileType ||
			Enums.FileType.Certificate === this.fileType ||
			Enums.FileType.Html === this.fileType ||
			Enums.FileType.Code === this.fileType
		;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isPdf = function ()
	{
		return Enums.FileType.Pdf === this.fileType;
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.isFramed = function ()
	{
		return this.framed && (Globals.__APP__ && Globals.__APP__.googlePreviewSupported()) &&
			!(this.isPdf() && Globals.bAllowPdfPreview) && !this.isText() && !this.isImage();
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.hasPreview = function ()
	{
		return this.isImage() || (this.isPdf() && Globals.bAllowPdfPreview) ||
			this.isText() || this.isFramed();
	};

	/**
	 * @return {boolean}
	 */
	AttachmentModel.prototype.hasPreplay = function ()
	{
		return (Audio.supportedMp3 && this.isMp3()) ||
			(Audio.supportedOgg && this.isOgg()) ||
			(Audio.supportedWav && this.isWav())
		;
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkDownload = function ()
	{
		return Links.attachmentDownload(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkPreview = function ()
	{
		return Links.attachmentPreview(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkThumbnail = function ()
	{
		return this.hasThumbnail() ? Links.attachmentThumbnailPreview(this.download) : '';
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkThumbnailPreviewStyle = function ()
	{
		var sLink = this.linkThumbnail();
		return '' === sLink ? '' : 'background:url(' + sLink + ')';
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkFramed = function ()
	{
		return Links.attachmentFramed(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkPreviewAsPlain = function ()
	{
		return Links.attachmentPreviewAsPlain(this.download);
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.linkPreviewMain = function ()
	{
		var sResult = '';
		switch (true)
		{
			case this.isImage():
			case this.isPdf() && Globals.bAllowPdfPreview:
				sResult = this.linkPreview();
				break;
			case this.isText():
				sResult = this.linkPreviewAsPlain();
				break;
			case this.isFramed():
				sResult = this.linkFramed();
				break;
		}

		return sResult;
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

	/**
	 * @param {string} sExt
	 * @param {string} sMimeType
	 * @return {string}
	 */
	AttachmentModel.staticFileType = _.memoize(function (sExt, sMimeType)
	{
		sExt = Utils.trim(sExt).toLowerCase();
		sMimeType = Utils.trim(sMimeType).toLowerCase();

		var
			sResult = Enums.FileType.Unknown,
			aMimeTypeParts = sMimeType.split('/')
		;

		switch (true)
		{
			case 'image' === aMimeTypeParts[0] || -1 < Utils.inArray(sExt, [
				'png', 'jpg', 'jpeg', 'gif', 'bmp'
			]):
				sResult = Enums.FileType.Image;
				break;
			case 'audio' === aMimeTypeParts[0] || -1 < Utils.inArray(sExt, [
				'mp3', 'ogg', 'oga', 'wav'
			]):
				sResult = Enums.FileType.Audio;
				break;
			case 'video' === aMimeTypeParts[0] || -1 < Utils.inArray(sExt, [
				'mkv', 'avi'
			]):
				sResult = Enums.FileType.Video;
				break;
			case -1 < Utils.inArray(sExt, [
				'php', 'js', 'css'
			]):
				sResult = Enums.FileType.Code;
				break;
			case 'eml' === sExt || -1 < Utils.inArray(sMimeType, [
				'message/delivery-status', 'message/rfc822'
			]):
				sResult = Enums.FileType.Eml;
				break;
			case ('text' === aMimeTypeParts[0] && 'html' !== aMimeTypeParts[1]) || -1 < Utils.inArray(sExt, [
				'txt', 'log'
			]):
				sResult = Enums.FileType.Text;
				break;
			case ('text/html' === sMimeType) || -1 < Utils.inArray(sExt, [
				'html'
			]):
				sResult = Enums.FileType.Html;
				break;
			case -1 < Utils.inArray(aMimeTypeParts[1], [
				'zip', '7z', 'tar', 'rar', 'gzip', 'bzip', 'bzip2', 'x-zip', 'x-7z', 'x-rar', 'x-tar', 'x-gzip', 'x-bzip', 'x-bzip2', 'x-zip-compressed', 'x-7z-compressed', 'x-rar-compressed'
			]) || -1 < Utils.inArray(sExt, [
				'zip', '7z', 'tar', 'rar', 'gzip', 'bzip', 'bzip2'
			]):
				sResult = Enums.FileType.Archive;
				break;
			case -1 < Utils.inArray(aMimeTypeParts[1], ['pdf', 'x-pdf']) || -1 < Utils.inArray(sExt, [
				'pdf'
			]):
				sResult = Enums.FileType.Pdf;
				break;
			case -1 < Utils.inArray(sMimeType, [
				'application/pgp-signature', 'application/pgp-keys'
			]) || -1 < Utils.inArray(sExt, [
				'asc', 'pem', 'ppk'
			]):
				sResult = Enums.FileType.Certificate;
				break;
			case -1 < Utils.inArray(sMimeType, ['application/pkcs7-signature']) ||
				-1 < Utils.inArray(sExt, ['p7s']):

				sResult = Enums.FileType.CertificateBin;
				break;
			case -1 < Utils.inArray(aMimeTypeParts[1], [
				'rtf', 'msword', 'vnd.msword', 'vnd.openxmlformats-officedocument.wordprocessingml.document',
				'vnd.openxmlformats-officedocument.wordprocessingml.template',
				'vnd.ms-word.document.macroEnabled.12',
				'vnd.ms-word.template.macroEnabled.12'
			]):
				sResult = Enums.FileType.WordText;
				break;
			case -1 < Utils.inArray(aMimeTypeParts[1], [
				'excel', 'ms-excel', 'vnd.ms-excel',
				'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'vnd.openxmlformats-officedocument.spreadsheetml.template',
				'vnd.ms-excel.sheet.macroEnabled.12',
				'vnd.ms-excel.template.macroEnabled.12',
				'vnd.ms-excel.addin.macroEnabled.12',
				'vnd.ms-excel.sheet.binary.macroEnabled.12'
			]):
				sResult = Enums.FileType.Sheet;
				break;
			case -1 < Utils.inArray(aMimeTypeParts[1], [
				'powerpoint', 'ms-powerpoint', 'vnd.ms-powerpoint',
				'vnd.openxmlformats-officedocument.presentationml.presentation',
				'vnd.openxmlformats-officedocument.presentationml.template',
				'vnd.openxmlformats-officedocument.presentationml.slideshow',
				'vnd.ms-powerpoint.addin.macroEnabled.12',
				'vnd.ms-powerpoint.presentation.macroEnabled.12',
				'vnd.ms-powerpoint.template.macroEnabled.12',
				'vnd.ms-powerpoint.slideshow.macroEnabled.12'
			]):
				sResult = Enums.FileType.Presentation;
				break;
		}

		return sResult;
	});

	/**
	 * @param {string} sFileType
	 * @return {string}
	 */
	AttachmentModel.staticIconClass = _.memoize(function (sFileType)
	{
		var
			sText = '',
			sClass = 'icon-file'
		;

		switch (sFileType)
		{
			case Enums.FileType.Text:
			case Enums.FileType.Eml:
			case Enums.FileType.WordText:
				sClass = 'icon-file-text';
				break;
			case Enums.FileType.Html:
			case Enums.FileType.Code:
				sClass = 'icon-file-code';
				break;
			case Enums.FileType.Image:
				sClass = 'icon-file-image';
				break;
			case Enums.FileType.Audio:
				sClass = 'icon-file-music';
				break;
			case Enums.FileType.Video:
				sClass = 'icon-file-movie';
				break;
			case Enums.FileType.Archive:
				sClass = 'icon-file-zip';
				break;
			case Enums.FileType.Certificate:
			case Enums.FileType.CertificateBin:
				sClass = 'icon-file-certificate';
				break;
			case Enums.FileType.Sheet:
				sClass = 'icon-file-excel';
				break;
			case Enums.FileType.Presentation:
				sClass = 'icon-file-chart-graph';
				break;
			case Enums.FileType.Pdf:
				sText = 'pdf';
				sClass = 'icon-none';
				break;
		}

		return [sClass, sText];
	});

	/**
	 * @param {string} sFileType
	 * @return {string}
	 */
	AttachmentModel.staticCombinedIconClass = function (aData)
	{
		var
			sClass = '',
			aTypes = []
		;

		if (Utils.isNonEmptyArray(aData))
		{
			sClass = 'icon-attachment';

			aTypes = _.uniq(_.compact(_.map(aData, function (aItem) {
				return aItem ? AttachmentModel.staticFileType(
					Utils.getFileExtension(aItem[0]), aItem[1]) : '';
			})));

			if (aTypes && 1 === aTypes.length && aTypes[0])
			{
				switch (aTypes[0])
				{
					case Enums.FileType.Text:
					case Enums.FileType.WordText:
						sClass = 'icon-file-text';
						break;
					case Enums.FileType.Html:
					case Enums.FileType.Code:
						sClass = 'icon-file-code';
						break;
					case Enums.FileType.Image:
						sClass = 'icon-file-image';
						break;
					case Enums.FileType.Audio:
						sClass = 'icon-file-music';
						break;
					case Enums.FileType.Video:
						sClass = 'icon-file-movie';
						break;
					case Enums.FileType.Archive:
						sClass = 'icon-file-zip';
						break;
					case Enums.FileType.Certificate:
					case Enums.FileType.CertificateBin:
						sClass = 'icon-file-certificate';
						break;
					case Enums.FileType.Sheet:
						sClass = 'icon-file-excel';
						break;
					case Enums.FileType.Presentation:
						sClass = 'icon-file-chart-graph';
						break;
				}
			}
		}

		return sClass;
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.iconClass = function ()
	{
		return AttachmentModel.staticIconClass(this.fileType)[0];
	};

	/**
	 * @return {string}
	 */
	AttachmentModel.prototype.iconText = function ()
	{
		return AttachmentModel.staticIconClass(this.fileType)[1];
	};

	module.exports = AttachmentModel;

}());