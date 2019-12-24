import window from 'window';
import _ from '_';
import ko from 'ko';

import { FileType } from 'Common/Enums';
import { bAllowPdfPreview, data as GlobalsData } from 'Common/Globals';
import { trim, pInt, inArray, isNonEmptyArray, getFileExtension, friendlySize } from 'Common/Utils';
import {
	attachmentDownload,
	attachmentPreview,
	attachmentFramed,
	attachmentPreviewAsPlain,
	attachmentThumbnailPreview
} from 'Common/Links';

import { AbstractModel } from 'Knoin/AbstractModel';

import Audio from 'Common/Audio';

/**
 * @param {string} sExt
 * @param {string} sMimeType
 * @returns {string}
 */
export const staticFileType = _.memoize((ext, mimeType) => {
	ext = trim(ext).toLowerCase();
	mimeType = trim(mimeType).toLowerCase();

	let result = FileType.Unknown;
	const mimeTypeParts = mimeType.split('/');

	switch (true) {
		case 'image' === mimeTypeParts[0] || -1 < inArray(ext, ['png', 'jpg', 'jpeg', 'gif', 'bmp']):
			result = FileType.Image;
			break;
		case 'audio' === mimeTypeParts[0] || -1 < inArray(ext, ['mp3', 'ogg', 'oga', 'wav']):
			result = FileType.Audio;
			break;
		case 'video' === mimeTypeParts[0] || -1 < inArray(ext, ['mkv', 'avi']):
			result = FileType.Video;
			break;
		case -1 < inArray(ext, ['php', 'js', 'css']):
			result = FileType.Code;
			break;
		case 'eml' === ext || -1 < inArray(mimeType, ['message/delivery-status', 'message/rfc822']):
			result = FileType.Eml;
			break;
		case ('text' === mimeTypeParts[0] && 'html' !== mimeTypeParts[1]) || -1 < inArray(ext, ['txt', 'log']):
			result = FileType.Text;
			break;
		case 'text/html' === mimeType || -1 < inArray(ext, ['html']):
			result = FileType.Html;
			break;
		case -1 <
			inArray(mimeTypeParts[1], [
				'zip',
				'7z',
				'tar',
				'rar',
				'gzip',
				'bzip',
				'bzip2',
				'x-zip',
				'x-7z',
				'x-rar',
				'x-tar',
				'x-gzip',
				'x-bzip',
				'x-bzip2',
				'x-zip-compressed',
				'x-7z-compressed',
				'x-rar-compressed'
			]) || -1 < inArray(ext, ['zip', '7z', 'tar', 'rar', 'gzip', 'bzip', 'bzip2']):
			result = FileType.Archive;
			break;
		case -1 < inArray(mimeTypeParts[1], ['pdf', 'x-pdf']) || -1 < inArray(ext, ['pdf']):
			result = FileType.Pdf;
			break;
		case -1 < inArray(mimeType, ['application/pgp-signature', 'application/pgp-keys']) ||
			-1 < inArray(ext, ['asc', 'pem', 'ppk']):
			result = FileType.Certificate;
			break;
		case -1 < inArray(mimeType, ['application/pkcs7-signature']) || -1 < inArray(ext, ['p7s']):
			result = FileType.CertificateBin;
			break;
		case -1 <
			inArray(mimeTypeParts[1], [
				'rtf',
				'msword',
				'vnd.msword',
				'vnd.openxmlformats-officedocument.wordprocessingml.document',
				'vnd.openxmlformats-officedocument.wordprocessingml.template',
				'vnd.ms-word.document.macroEnabled.12',
				'vnd.ms-word.template.macroEnabled.12'
			]):
			result = FileType.WordText;
			break;
		case -1 <
			inArray(mimeTypeParts[1], [
				'excel',
				'ms-excel',
				'vnd.ms-excel',
				'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'vnd.openxmlformats-officedocument.spreadsheetml.template',
				'vnd.ms-excel.sheet.macroEnabled.12',
				'vnd.ms-excel.template.macroEnabled.12',
				'vnd.ms-excel.addin.macroEnabled.12',
				'vnd.ms-excel.sheet.binary.macroEnabled.12'
			]):
			result = FileType.Sheet;
			break;
		case -1 <
			inArray(mimeTypeParts[1], [
				'powerpoint',
				'ms-powerpoint',
				'vnd.ms-powerpoint',
				'vnd.openxmlformats-officedocument.presentationml.presentation',
				'vnd.openxmlformats-officedocument.presentationml.template',
				'vnd.openxmlformats-officedocument.presentationml.slideshow',
				'vnd.ms-powerpoint.addin.macroEnabled.12',
				'vnd.ms-powerpoint.presentation.macroEnabled.12',
				'vnd.ms-powerpoint.template.macroEnabled.12',
				'vnd.ms-powerpoint.slideshow.macroEnabled.12'
			]):
			result = FileType.Presentation;
			break;
		// no default
	}

	return result;
});

/**
 * @param {string} sFileType
 * @returns {string}
 */
export const staticIconClass = _.memoize((fileType) => {
	let resultText = '',
		resultClass = 'icon-file';

	switch (fileType) {
		case FileType.Text:
		case FileType.Eml:
		case FileType.WordText:
			resultClass = 'icon-file-text';
			break;
		case FileType.Html:
		case FileType.Code:
			resultClass = 'icon-file-code';
			break;
		case FileType.Image:
			resultClass = 'icon-file-image';
			break;
		case FileType.Audio:
			resultClass = 'icon-file-music';
			break;
		case FileType.Video:
			resultClass = 'icon-file-movie';
			break;
		case FileType.Archive:
			resultClass = 'icon-file-zip';
			break;
		case FileType.Certificate:
		case FileType.CertificateBin:
			resultClass = 'icon-file-certificate';
			break;
		case FileType.Sheet:
			resultClass = 'icon-file-excel';
			break;
		case FileType.Presentation:
			resultClass = 'icon-file-chart-graph';
			break;
		case FileType.Pdf:
			resultText = 'pdf';
			resultClass = 'icon-none';
			break;
		// no default
	}

	return [resultClass, resultText];
});

/**
 * @static
 * @param {string} sFileType
 * @returns {string}
 */
export const staticCombinedIconClass = (data) => {
	let result = '',
		types = [];

	if (isNonEmptyArray(data)) {
		result = 'icon-attachment';
		types = _.uniq(_.compact(_.map(data, (item) => (item ? staticFileType(getFileExtension(item[0]), item[1]) : ''))));

		if (types && 1 === types.length && types[0]) {
			switch (types[0]) {
				case FileType.Text:
				case FileType.WordText:
					result = 'icon-file-text';
					break;
				case FileType.Html:
				case FileType.Code:
					result = 'icon-file-code';
					break;
				case FileType.Image:
					result = 'icon-file-image';
					break;
				case FileType.Audio:
					result = 'icon-file-music';
					break;
				case FileType.Video:
					result = 'icon-file-movie';
					break;
				case FileType.Archive:
					result = 'icon-file-zip';
					break;
				case FileType.Certificate:
				case FileType.CertificateBin:
					result = 'icon-file-certificate';
					break;
				case FileType.Sheet:
					result = 'icon-file-excel';
					break;
				case FileType.Presentation:
					result = 'icon-file-chart-graph';
					break;
				// no default
			}
		}
	}

	return result;
};

class AttachmentModel extends AbstractModel {
	constructor() {
		super('AttachmentModel');

		this.checked = ko.observable(false);

		this.mimeType = '';
		this.fileName = '';
		this.fileNameExt = '';
		this.fileType = FileType.Unknown;
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

	/**
	 * @static
	 * @param {AjaxJsonAttachment} json
	 * @returns {?AttachmentModel}
	 */
	static newInstanceFromJson(json) {
		const attachment = new AttachmentModel();
		return attachment.initByJson(json) ? attachment : null;
	}

	/**
	 * @param {AjaxJsonAttachment} json
	 * @returns {boolean}
	 */
	initByJson(json) {
		let bResult = false;
		if (json && 'Object/Attachment' === json['@Object']) {
			this.mimeType = trim((json.MimeType || '').toLowerCase());
			this.fileName = trim(json.FileName);
			this.estimatedSize = pInt(json.EstimatedSize);
			this.isInline = !!json.IsInline;
			this.isLinked = !!json.IsLinked;
			this.isThumbnail = !!json.IsThumbnail;
			this.cid = json.CID;
			this.contentLocation = json.ContentLocation;
			this.download = json.Download;

			this.folder = json.Folder;
			this.uid = json.Uid;
			this.mimeIndex = json.MimeIndex;
			this.framed = !!json.Framed;

			this.friendlySize = friendlySize(this.estimatedSize);
			this.cidWithOutTags = this.cid.replace(/^<+/, '').replace(/>+$/, '');

			this.fileNameExt = getFileExtension(this.fileName);
			this.fileType = staticFileType(this.fileNameExt, this.mimeType);

			bResult = true;
		}

		return bResult;
	}

	/**
	 * @returns {boolean}
	 */
	isImage() {
		return FileType.Image === this.fileType;
	}

	/**
	 * @returns {boolean}
	 */
	isMp3() {
		return FileType.Audio === this.fileType && 'mp3' === this.fileNameExt;
	}

	/**
	 * @returns {boolean}
	 */
	isOgg() {
		return FileType.Audio === this.fileType && ('oga' === this.fileNameExt || 'ogg' === this.fileNameExt);
	}

	/**
	 * @returns {boolean}
	 */
	isWav() {
		return FileType.Audio === this.fileType && 'wav' === this.fileNameExt;
	}

	/**
	 * @returns {boolean}
	 */
	hasThumbnail() {
		return this.isThumbnail;
	}

	/**
	 * @returns {boolean}
	 */
	isText() {
		return (
			FileType.Text === this.fileType ||
			FileType.Eml === this.fileType ||
			FileType.Certificate === this.fileType ||
			FileType.Html === this.fileType ||
			FileType.Code === this.fileType
		);
	}

	/**
	 * @returns {boolean}
	 */
	isPdf() {
		return FileType.Pdf === this.fileType;
	}

	/**
	 * @returns {boolean}
	 */
	isFramed() {
		return (
			this.framed &&
			GlobalsData.__APP__ &&
			GlobalsData.__APP__.googlePreviewSupported() &&
			!(this.isPdf() && bAllowPdfPreview) &&
			!this.isText() &&
			!this.isImage()
		);
	}

	/**
	 * @returns {boolean}
	 */
	hasPreview() {
		return this.isImage() || (this.isPdf() && bAllowPdfPreview) || this.isText() || this.isFramed();
	}

	/**
	 * @returns {boolean}
	 */
	hasPreplay() {
		return (
			(Audio.supportedMp3 && this.isMp3()) ||
			(Audio.supportedOgg && this.isOgg()) ||
			(Audio.supportedWav && this.isWav())
		);
	}

	/**
	 * @returns {string}
	 */
	linkDownload() {
		return attachmentDownload(this.download);
	}

	/**
	 * @returns {string}
	 */
	linkPreview() {
		return attachmentPreview(this.download);
	}

	/**
	 * @returns {string}
	 */
	linkThumbnail() {
		return this.hasThumbnail() ? attachmentThumbnailPreview(this.download) : '';
	}

	/**
	 * @returns {string}
	 */
	linkThumbnailPreviewStyle() {
		const link = this.linkThumbnail();
		return '' === link ? '' : 'background:url(' + link + ')';
	}

	/**
	 * @returns {string}
	 */
	linkFramed() {
		return attachmentFramed(this.download);
	}

	/**
	 * @returns {string}
	 */
	linkPreviewAsPlain() {
		return attachmentPreviewAsPlain(this.download);
	}

	/**
	 * @returns {string}
	 */
	linkPreviewMain() {
		let result = '';
		switch (true) {
			case this.isImage():
			case this.isPdf() && bAllowPdfPreview:
				result = this.linkPreview();
				break;
			case this.isText():
				result = this.linkPreviewAsPlain();
				break;
			case this.isFramed():
				result = this.linkFramed();
				break;
			// no default
		}

		return result;
	}

	/**
	 * @returns {string}
	 */
	generateTransferDownloadUrl() {
		let link = this.linkDownload();
		if ('http' !== link.substr(0, 4)) {
			link = window.location.protocol + '//' + window.location.host + window.location.pathname + link;
		}

		return this.mimeType + ':' + this.fileName + ':' + link;
	}

	/**
	 * @param {AttachmentModel} attachment
	 * @param {*} event
	 * @returns {boolean}
	 */
	eventDragStart(attachment, event) {
		const localEvent = event.originalEvent || event;
		if (attachment && localEvent && localEvent.dataTransfer && localEvent.dataTransfer.setData) {
			localEvent.dataTransfer.setData('DownloadURL', this.generateTransferDownloadUrl());
		}

		return true;
	}

	/**
	 * @returns {string}
	 */
	iconClass() {
		return staticIconClass(this.fileType)[0];
	}

	/**
	 * @returns {string}
	 */
	iconText() {
		return staticIconClass(this.fileType)[1];
	}
}

export { AttachmentModel, AttachmentModel as default };
