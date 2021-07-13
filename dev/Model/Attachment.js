import ko from 'ko';

import { FileInfo, FileType } from 'Common/File';
import {
	attachmentDownload,
	serverRequestRaw
} from 'Common/Links';

import { AbstractModel } from 'Knoin/AbstractModel';

import { SMAudio } from 'Common/Audio';

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
			attachment.friendlySize = FileInfo.friendlySize(json.EstimatedSize);
			attachment.cidWithoutTags = attachment.cid.replace(/^<+/, '').replace(/>+$/, '');

			attachment.fileNameExt = FileInfo.getExtension(attachment.fileName);
			attachment.fileType = FileInfo.getType(attachment.fileNameExt, attachment.mimeType);
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
		return FileType.Text === this.fileType || FileType.Eml === this.fileType;
	}

	/**
	 * @returns {boolean}
	 */
	pdfPreview() {
		return null != navigator.mimeTypes['application/pdf'] && FileType.Pdf === this.fileType;
	}

	/**
	 * @returns {boolean}
	 */
	hasPreview() {
		return this.isImage() || this.pdfPreview() || this.isText();
	}

	/**
	 * @returns {boolean}
	 */
	hasPreplay() {
		return (
			(SMAudio.supportedMp3 && this.isMp3()) ||
			(SMAudio.supportedOgg && this.isOgg()) ||
			(SMAudio.supportedWav && this.isWav())
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
		return serverRequestRaw('View', this.download);
	}

	/**
	 * @returns {string}
	 */
	linkThumbnail() {
		return this.hasThumbnail() ? serverRequestRaw('ViewThumbnail', this.download) : '';
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
	linkPreviewMain() {
		let result = '';
		switch (true) {
			case this.isImage():
			case this.pdfPreview():
				result = this.linkPreview();
				break;
			case this.isText():
				result = serverRequestRaw('ViewAsPlain', this.download);
				break;
			// no default
		}

		return result;
	}

	/**
	 * @param {AttachmentModel} attachment
	 * @param {*} event
	 * @returns {boolean}
	 */
	eventDragStart(attachment, event) {
		const localEvent = event.originalEvent || event;
		if (attachment && localEvent && localEvent.dataTransfer && localEvent.dataTransfer.setData) {
			let link = this.linkDownload();
			if ('http' !== link.substr(0, 4)) {
				link = location.protocol + '//' + location.host + location.pathname + link;
			}
			localEvent.dataTransfer.setData('DownloadURL', this.mimeType + ':' + this.fileName + ':' + link);
		}

		return true;
	}

	/**
	 * @returns {string}
	 */
	iconClass() {
		return FileInfo.getTypeIconClass(this.fileType);
	}
}
