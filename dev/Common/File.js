/* eslint key-spacing: 0 */
/* eslint quote-props: 0 */

import { isNonEmptyArray } from 'Common/Utils';

const
	cache = {},
	app = 'application/',
	msOffice = app+'vnd.openxmlformats-officedocument.',
	openDoc = app+'vnd.oasis.opendocument.',
	sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'],

	exts = {
		eml: 'message/rfc822',
		mime: 'message/rfc822',
		vcard: 'text/vcard',
		vcf: 'text/vcard',
		htm: 'text/html',
		html: 'text/html',
		csv: 'text/csv',
		ics: 'text/calendar',
		xml: 'text/xml',
		json: app+'json',
		asc: app+'pgp-signature',
		p10: app+'pkcs10',
		p7c: app+'pkcs7-mime',
		p7m: app+'pkcs7-mime',
		p7s: app+'pkcs7-signature',
		torrent: app+'x-bittorrent',

		// scripts
		js: app+'javascript',
		pl: 'text/perl',
		css: 'text/css',
		asp: 'text/asp',
		php: app+'x-php',

		// images
		jpg: 'image/jpeg',
		ico: 'image/x-icon',
		tif: 'image/tiff',
		svg: 'image/svg+xml',
		svgz: 'image/svg+xml',

		// archives
		zip: app+'zip',
		'7z': app+'x-7z-compressed',
		rar: app+'x-rar-compressed',
		cab: app+'vnd.ms-cab-compressed',
		gz: app+'x-gzip',
		tgz: app+'x-gzip',
		bz: app+'x-bzip',
		bz2: app+'x-bzip2',
		deb: app+'x-debian-package',

		// audio
		mp3: 'audio/mpeg',
		wav: 'audio/x-wav',
		mp4a: 'audio/mp4',
		weba: 'audio/webm',
		m3u: 'audio/x-mpegurl',

		// video
		qt: 'video/quicktime',
		mov: 'video/quicktime',
		wmv: 'video/windows-media',
		avi: 'video/x-msvideo',
		'3gp': 'video/3gpp',
		'3g2': 'video/3gpp2',
		mp4v: 'video/mp4',
		mpg4: 'video/mp4',
		ogv: 'video/ogg',
		m4v: 'video/x-m4v',
		asf: 'video/x-ms-asf',
		asx: 'video/x-ms-asf',
		wm: 'video/x-ms-wm',
		wmx: 'video/x-ms-wmx',
		wvx: 'video/x-ms-wvx',
		movie: 'video/x-sgi-movie',

		// adobe
		pdf: app+'pdf',
		psd: 'image/vnd.adobe.photoshop',
		ai: app+'postscript',
		eps: app+'postscript',
		ps: app+'postscript',

		// ms office
		doc: app+'msword',
		rtf: app+'rtf',
		xls: app+'vnd.ms-excel',
		ppt: app+'vnd.ms-powerpoint',
		docx: msOffice+'wordprocessingml.document',
		xlsx: msOffice+'spreadsheetml.sheet',
		dotx: msOffice+'wordprocessingml.template',
		pptx: msOffice+'presentationml.presentation',

		// open office
		odt: openDoc+'text',
		ods: openDoc+'spreadsheet',
		odp: openDoc+'presentation'
	};

export const FileType = {
	Unknown: 'unknown',
	Text: 'text',
	Code: 'code',
	Eml: 'eml',
	Word: 'word',
	Pdf: 'pdf',
	Image: 'image',
	Audio: 'audio',
	Video: 'video',
	Spreadsheet: 'spreadsheet',
	Presentation: 'presentation',
	Certificate: 'certificate',
	Archive: 'archive'
};

export const FileInfo = {
	/**
	 * @param {string} fileName
	 * @returns {string}
	 */
	getExtension: fileName => {
		fileName = fileName.toLowerCase().trim();
		const result = fileName.split('.').pop();
		return result === fileName ? '' : result;
	},

	getContentType: fileName => {
		fileName = fileName.toLowerCase().trim();
		if ('winmail.dat' === fileName) {
			return app + 'ms-tnef';
		}
		let ext = fileName.split('.').pop();
		if (/^(txt|text|def|list|in|ini|log|sql|cfg|conf)$/.test(ext))
			return 'text/plain';
		if (/^(mpe?g|mpe|m1v|m2v)$/.test(ext))
			return 'video/mpeg';
		if (/^aif[cf]?$/.test(ext))
			return 'audio/aiff';
		if (/^(aac|flac|midi|ogg)$/.test(ext))
			return 'audio/'+ext;
		if (/^(h26[134]|jpgv|mp4|webm)$/.test(ext))
			return 'video/'+ext;
		if (/^(otf|sfnt|ttf|woff2?)$/.test(ext))
			return 'font/'+ext;
		if (/^(png|jpeg|gif|tiff|webp)$/.test(ext))
			return 'image/'+ext;

		return exts[ext] || app+'octet-stream';
	},

	/**
	 * @param {string} sExt
	 * @param {string} sMimeType
	 * @returns {string}
	 */
	getType: (ext, mimeType) => {
		ext = ext.toLowerCase().trim();
		mimeType = mimeType.toLowerCase().trim().replace('csv/plain', 'text/csv');

		let key = ext + mimeType;
		if (cache[key]) {
			return cache[key];
		}

		let result = FileType.Unknown;
		const mimeTypeParts = mimeType.split('/'),
			type = mimeTypeParts[1].replace('x-','').replace('-compressed',''),
			match = str => mimeType.includes(str),
			archive = /^(zip|7z|tar|rar|gzip|bzip|bzip2)$/;

		switch (true) {
			case 'image' == mimeTypeParts[0] || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext):
				result = FileType.Image;
				break;
			case 'audio' == mimeTypeParts[0] || ['mp3', 'ogg', 'oga', 'wav'].includes(ext):
				result = FileType.Audio;
				break;
			case 'video' == mimeTypeParts[0] || 'mkv' == ext || 'avi' == ext:
				result = FileType.Video;
				break;
			case ['php', 'js', 'css', 'xml', 'html'].includes(ext) || 'text/html' == mimeType:
				result = FileType.Code;
				break;
			case 'eml' == ext || ['message/delivery-status', 'message/rfc822'].includes(mimeType):
				result = FileType.Eml;
				break;
			case 'text' == mimeTypeParts[0] || 'txt' == ext || 'log' == ext:
				result = FileType.Text;
				break;
			case archive.test(type) || archive.test(ext):
				result = FileType.Archive;
				break;
			case 'pdf' == type || 'pdf' == ext:
				result = FileType.Pdf;
				break;
			case [app+'pgp-signature', app+'pgp-keys'].includes(mimeType)
				|| ['asc', 'pem', 'ppk'].includes(ext)
				|| [app+'pkcs7-signature'].includes(mimeType) || 'p7s' == ext:
				result = FileType.Certificate;
				break;
			case match(msOffice+'.wordprocessingml') || match(openDoc+'.text') || match('vnd.ms-word')
				|| ['rtf', 'msword', 'vnd.msword'].includes(type):
				result = FileType.Word;
				break;
			case match(msOffice+'.spreadsheetml') || match(openDoc+'.spreadsheet') || match('ms-excel'):
				result = FileType.Spreadsheet;
				break;
			case match(msOffice+'.presentationml') || match(openDoc+'.presentation') || match('ms-powerpoint'):
				result = FileType.Presentation;
				break;
			// no default
		}

		return cache[key] = result;
	},

	/**
	 * @param {string} sFileType
	 * @returns {string}
	 */
	getTypeIconClass: fileType => {
		let result = 'icon-file';
		switch (fileType) {
			case FileType.Text:
			case FileType.Eml:
			case FileType.Pdf:
			case FileType.Word:
				return result + '-text';
			case FileType.Code:
			case FileType.Image:
			case FileType.Audio:
			case FileType.Video:
			case FileType.Archive:
			case FileType.Certificate:
			case FileType.Spreadsheet:
			case FileType.Presentation:
				return result + '-' + fileType;
		}
		return result;
	},

	getIconClass: (ext, mime) => FileInfo.getTypeIconClass(FileInfo.getType(ext, mime)),

	/**
	 * @param {string} sFileType
	 * @returns {string}
	 */
	getCombinedIconClass: data => {
		if (isNonEmptyArray(data)) {
			let icons = data
				.map(item => item ? FileInfo.getIconClass(FileInfo.getExtension(item[0]), item[1]) : '')
				.validUnique();

			return (icons && 1 === icons.length && 'icon-file' !== icons[0])
				 ? icons[0]
				 : 'icon-attachment';
		}

		return '';
	},

	friendlySize: bytes => {
		bytes = parseInt(bytes, 10) || 0;
		let i = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, i)).toFixed(2>i ? 0 : 1) + ' ' + sizes[i];
	}

};
