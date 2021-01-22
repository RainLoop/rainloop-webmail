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

export class AttachmentModel extends AbstractModel {
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
	 * @param {FetchJsonAttachment} json
	 * @returns {?AttachmentModel}
	 */
	static reviveFromJson(json) {
		const attachment = super.reviveFromJson(json);
		if (attachment) {
			attachment.friendlySize = File.friendlySize(json.EstimatedSize);
			attachment.cidWithoutTags = attachment.cid.replace(/^<+/, '').replace(/>+$/, '');

			attachment.fileNameExt = File.getExtension(attachment.fileName);
			attachment.fileType = File.getType(attachment.fileNameExt, attachment.mimeType);
		}
		return attachment;
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
