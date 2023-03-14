
import { ParseMime } from 'Mime/Parser';
import { AttachmentModel } from 'Model/Attachment';
import { FileInfo } from 'Common/File';
import { BEGIN_PGP_MESSAGE } from 'Stores/User/Pgp';

/**
 * @param string data
 * @param MessageModel message
 */
export function MimeToMessage(data, message)
{
	let signed;
	const struct = ParseMime(data);
	if (struct.headers) {
		let html = struct.getByContentType('text/html');
		html = html ? html.body : '';

		message.subject(struct.headerValue('subject') || '');

		// EmailCollectionModel
		['from','to'].forEach(name => message[name].fromString(struct.headerValue(name)));

		struct.forEach(part => {
			let cd = part.header('content-disposition'),
				cId = part.header('content-id'),
				type = part.header('content-type');
			if (cId || cd) {
				// if (cd && 'attachment' === cd.value) {
				let attachment = new AttachmentModel;
				attachment.mimeType = type.value;
				attachment.fileName = type.name || (cd && cd.params.filename) || '';
				attachment.fileNameExt = attachment.fileName.replace(/^.+(\.[a-z]+)$/, '$1');
				attachment.fileType = FileInfo.getType('', type.value);
				attachment.url = part.dataUrl;
				attachment.estimatedSize = part.body.length;
/*
				attachment.contentLocation = '';
				attachment.folder = '';
				attachment.uid = '';
				attachment.mimeIndex = part.id;
*/
				attachment.cId = cId ? cId.value : '';
				if (cId && html) {
					let cid = 'cid:' + attachment.contentId(),
						found = html.includes(cid);
					attachment.isInline(found);
					attachment.isLinked(found);
					found && (html = html
						.replace('src="' + cid + '"', 'src="' + attachment.url + '"')
						.replace("src='" + cid + "'", "src='" + attachment.url + "'")
					);
				} else {
					message.attachments.push(attachment);
				}
			} else if ('multipart/signed' === type.value && 'application/pgp-signature' === type.params.protocol) {
				signed = {
					micAlg: type.micalg,
					bodyPart: part.parts[0],
					sigPart: part.parts[1]
				};
			}
		});

		const text = struct.getByContentType('text/plain');
		message.plain(text ? text.body : '');
		message.html(html);
	} else {
		message.plain(data);
	}

	if (!signed && message.plain().includes(BEGIN_PGP_MESSAGE)) {
		signed = true;
	}
	message.pgpSigned(signed);

	// TODO: Verify instantly?
}
