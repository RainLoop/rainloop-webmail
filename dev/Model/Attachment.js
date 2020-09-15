import ko from 'ko';

import { FileType } from 'Common/Enums';
import { bMobileDevice } from 'Common/Globals';
import { pInt, getFileExtension, friendlySize } from 'Common/Utils';
import {
	attachmentDownload,
	attachmentPreview,
	attachmentFramed,
	attachmentPreviewAsPlain,
	attachmentThumbnailPreview
} from 'Common/Links';

import { AbstractModel } from 'Knoin/AbstractModel';

import Audio from 'Common/Audio';

const bAllowPdfPreview = !bMobileDevice && undefined !== navigator.mimeTypes['application/pdf'];

/**
 * @param {string} sExt
 * @param {string} sMimeType
 * @returns {string}
 */
export const staticFileType = (() => {
	let cache = {},
		msOffice = 'vnd.openxmlformats-officedocument',
		openDoc = 'vnd.oasis.opendocument';
	return (ext, mimeType) => {
		ext = ext.toLowerCase().trim();
		mimeType = mimeType.toLowerCase().trim();

		let key = ext + mimeType;
		if (cache[key]) {
			return cache[key];
		}

		let result = FileType.Unknown;
		const mimeTypeParts = mimeType.split('/'),
			type = mimeTypeParts[1],
			match = str => type.includes(str);

		switch (true) {
			case 'image' === mimeTypeParts[0] || ['png', 'jpg', 'jpeg', 'gif'].includes(ext):
				result = FileType.Image;
				break;
			case 'audio' === mimeTypeParts[0] || ['mp3', 'ogg', 'oga', 'wav'].includes(ext):
				result = FileType.Audio;
				break;
			case 'video' === mimeTypeParts[0] || ['mkv', 'avi'].includes(ext):
				result = FileType.Video;
				break;
			case ['php', 'js', 'css'].includes(ext):
				result = FileType.Code;
				break;
			case 'eml' === ext || ['message/delivery-status', 'message/rfc822'].includes(mimeType):
				result = FileType.Eml;
				break;
			case ('text' === mimeTypeParts[0] && 'html' !== type) || ['txt', 'log'].includes(ext):
				result = FileType.Text;
				break;
			case 'text/html' === mimeType || ['html'].includes(ext):
				result = FileType.Html;
				break;
			case [
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
				].includes(type) || ['zip', '7z', 'tar', 'rar', 'gzip', 'bzip', 'bzip2'].includes(ext):
				result = FileType.Archive;
				break;
			case ['pdf', 'x-pdf'].includes(type) || ['pdf'].includes(ext):
				result = FileType.Pdf;
				break;
			case ['application/pgp-signature', 'application/pgp-keys'].includes(mimeType) ||
				['asc', 'pem', 'ppk'].includes(ext):
				result = FileType.Certificate;
				break;
			case ['application/pkcs7-signature'].includes(mimeType) || ['p7s'].includes(ext):
				result = FileType.CertificateBin;
				break;
			case match(msOffice+'.wordprocessingml') || match(openDoc+'.text') || match('vnd.ms-word')
				|| ['rtf', 'msword', 'vnd.msword'].includes(type):
				result = FileType.WordText;
				break;
			case match(msOffice+'.spreadsheetml') || match(openDoc+'.spreadsheet') || match('ms-excel'):
				result = FileType.Sheet;
				break;
			case match(msOffice+'.presentationml') || match(openDoc+'.presentation') || match('ms-powerpoint'):
				result = FileType.Presentation;
				break;
			// no default
		}

		return cache[key] = result;
	};
})();

/**
 * @param {string} sFileType
 * @returns {string}
 */
export const staticIconClass = fileType => FileType.getIconClass(fileType);

/**
 * @static
 * @param {string} sFileType
 * @returns {string}
 */
export const staticCombinedIconClass = (data) => {
	let result = '',
		types = [];

	if (Array.isNotEmpty(data)) {
		result = 'icon-attachment';
		types = data.map(item => item ? staticFileType(getFileExtension(item[0]), item[1]) : '')
			.filter((value, index, self) => !!value && self.indexOf(value) == index);

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
			this.mimeType = ((json.MimeType || '').toLowerCase()).trim();
			this.fileName = json.FileName.trim();
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
	hasPreview() {
		return this.isImage() || (this.isPdf() && bAllowPdfPreview) || this.isText();
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
		return link ? 'background:url(' + link + ')' : '';
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
			link = location.protocol + '//' + location.host + location.pathname + link;
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
