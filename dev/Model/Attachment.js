import ko from 'ko';

import { File, FileType } from 'Common/File';
import {
	attachmentDownload,
	attachmentPreview,
	attachmentFramed,
	attachmentPreviewAsPlain,
	attachmentThumbnailPreview
} from 'Common/Links';

import { AbstractModel } from 'Knoin/AbstractModel';

import Audio from 'Common/Audio';

const bAllowPdfPreview = undefined !== navigator.mimeTypes['application/pdf'];

class AttachmentModel extends AbstractModel {
	constructor() {
		super();

		this.checked = ko.observable(false);

		this.mimeType = '';
		this.fileName = '';
		this.fileNameExt = '';
		this.fileType = FileType.Unknown;
		this.friendlySize = '';
		this.isInline = false;
		this.isLinked = false;
		this.isThumbnail = false;
		this.cid = '';
		this.cidWithoutTags = '';
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
			// if it is inline
			this.isInline = !!json.IsInline;
			// if inline image is linked with CID in html
			// and 'src="cid:' or background-image:url(cid:)
			this.isLinked = !!json.IsLinked;
			this.isThumbnail = !!json.IsThumbnail;
			this.cid = json.CID;
			this.contentLocation = json.ContentLocation;
			this.download = json.Download;

			this.folder = json.Folder;
			this.uid = json.Uid;
			this.mimeIndex = json.MimeIndex;
			this.framed = !!json.Framed;

			this.friendlySize = File.friendlySize(json.EstimatedSize);
			this.cidWithoutTags = this.cid.replace(/^<+/, '').replace(/>+$/, '');

			this.fileNameExt = File.getExtension(this.fileName);
			this.fileType = File.getType(this.fileNameExt, this.mimeType);

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
		return File.getTypeIconClass(this.fileType)[0];
	}

	/**
	 * @returns {string}
	 */
	iconText() {
		return File.getTypeIconClass(this.fileType)[1];
	}
}

export { AttachmentModel, AttachmentModel as default };
