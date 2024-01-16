<?php

namespace SnappyMail\File;

// use MailSo\Mime\Enumerations\MimeType;

abstract class MimeType
{
	protected static $finfo = null;

	protected static function initFInfo() : void
	{
		if (null === self::$finfo) {
//			if (!\getenv('MAGIC')) { \putenv('MAGIC='.__DIR__.'/magic.mime'.(WINDOWS_OS?'.win32':'')); } # /usr/share/misc/magic
			self::$finfo = \class_exists('finfo', false) ? new \finfo(FILEINFO_MIME) : false; // FILEINFO_CONTINUE
		}
	}

	protected static function detectDeeper(string $mime, string $name = '') : string
	{
		if ('application/ogg' === $mime
		 || 'application/vnd.ms-office' === $mime
		 || 'application/octet-stream' === $mime
		 || 'application/zip' === $mime) {
			return static::fromFilename($name) ?: $mime;
		}
		return $mime;
	}

	public static function fromFile(string $filename, string $name = '') : ?string
	{
		$mime = null;
		if (\is_file($filename)) {
			static::initFInfo();
			if (self::$finfo) {
				$mime = \preg_replace('#[,;].*#', '', self::$finfo->file($filename));
			}
			if (!$mime && \is_callable('mime_content_type')) {
				$mime = \mime_content_type($filename);
			}
			if (!$mime && $fp = \fopen($filename, 'rb')) {
				$mime = self::fromStream($fp);
				\fclose($fp);
			}
			if ('application/zip' === \str_replace('/x-', '/', $mime)) {
				$zip = new \ZipArchive();
				if ($zip->open($filename, \ZIPARCHIVE::RDONLY)) {
					if (false !== $zip->locateName('word/_rels/document.xml.rels')) {
						return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
					}
					if (false !== $zip->locateName('xl/_rels/workbook.xml.rels')) {
						return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
					}
				}
			}
		}
		return $mime ? static::detectDeeper($mime, $name ?: $filename) : null;
	}

	public static function fromStream($stream, string $name = '') : ?string
	{
		if (\is_resource($stream) && \stream_get_meta_data($stream)['seekable']) {
			$pos = \ftell($stream);
//			if (\is_int($pos) && \rewind($stream)) {
			if (\is_int($pos) && 0 === \fseek($stream, 0)) {
//				$str = \fread($stream, 265);
				$str = \stream_get_contents($stream, 265, 0);
				\fseek($stream, $pos);
				if ($str) {
					return static::fromString($str, $name);
				}
			}
		}
		return null;
	}

	public static function fromString(string &$str, string $name = '') : ?string
	{
		static::initFInfo();
		$mime = self::$finfo
			? \preg_replace('#[,;].*#', '', self::$finfo->buffer($str))
			: self::getFromData($str);
		return $mime ? static::detectDeeper($mime, $name) : null;
	}

	protected static function getFromData(string $str) : ?string
	{
		if (\str_contains($str, '-----BEGIN PGP SIGNATURE-----')) {
			return 'application/pgp-signature';
		}
		if (\preg_match('/-----BEGIN PGP (PUBLIC|PRIVATE) KEY BLOCK-----/', $str)) {
			return 'application/pgp-keys';
		}
		static $magic;
		if (!$magic) {
			require __DIR__ . '/magic.mime.php';
		}
		$str = \preg_replace(\array_keys($magic), \array_values($magic), $str, 1, $c);
		return $c ? $str : null;
	}

	public static function fromFilename(string $filename) : ?string
	{
		$filename = \strtolower($filename);
		if ('winmail.dat' === $filename) {
			return 'application/ms-tnef';
		}
		$extension = \explode('.', $filename);
		$extension = \array_pop($extension);
		return isset(static::$types[$extension]) ? static::$types[$extension] : null;
	}

	/**
	 * Issue with 'text/plain'
	 */
	public static function toExtension(string $mime, bool $include_dot = true) : ?string
	{
		$mime = \strtolower($mime);
		if ('application/pgp-signature' == $mime || 'application/pgp-keys' == $mime) {
			$ext = 'asc';
		} else {
			$mime = \str_replace('application/x-tar', 'application/gtar', $mime);
			$ext = \array_search($mime, static::$types)
				?: \array_search(\str_replace('/x-', '/', $mime), static::$types)
				?: \array_search(\str_replace('/', '/x-', $mime), static::$types)
				?: 'bin';
		}
		return ($include_dot ? '.' : '') . $ext;
	}

	protected static $types = [
		'7z' => 'application/x-7z-compressed',
		'ai' => 'application/postscript',
//		'asc' => 'application/pgp-signature',
//		'asc' => 'application/pgp-keys',
		'bat' => 'application/x-msdownload',
		'bz' => 'application/x-bzip',
		'bz2' => 'application/x-bzip2',
		'cab' => 'application/vnd.ms-cab-compressed',
		'chm' => 'application/vnd.ms-htmlhelp',
		'com' => 'application/x-msdownload',
		'deb' => 'application/x-debian-package',
		'dll' => 'application/x-msdownload',
		'doc' => 'application/msword',
		'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'dot' => 'application/msword',
		'dotx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
		'eps' => 'application/postscript',
		'epub' => 'application/epub',
		'exe' => 'application/x-msdownload',
		'gz' => 'application/gzip',
		'gz' => 'application/x-gzip',
		'hlp' => 'application/winhlp',
		'js' => 'application/javascript',
		'json' => 'application/json',
		'msi' => 'application/x-msdownload',
		'odp' => 'application/vnd.oasis.opendocument.presentation',
		'ods' => 'application/vnd.oasis.opendocument.spreadsheet',
		'odt' => 'application/vnd.oasis.opendocument.text',
		'ogx' => 'application/ogg',
		'p10' => 'application/pkcs10',
		'p7c' => 'application/pkcs7-mime',
		'p7m' => 'application/pkcs7-mime',
		'p7s' => 'application/pkcs7-signature',
		'pdf' => 'application/pdf',
		'php' => 'application/x-httpd-php',
		'php' => 'application/x-php',
		'ppt' => 'application/vnd.ms-powerpoint',
		'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		'ps' => 'application/postscript',
		'psd' => 'image/vnd.adobe.photoshop',
		'rar' => 'application/rar-compressed',
		'rar' => 'application/x-rar-compressed',
		'rtf' => 'application/rtf',
		'scr' => 'application/x-msdownload',
		'sql' => 'application/sql',
		'swf' => 'application/shockwave-flash',
		'swf' => 'application/x-shockwave-flash',
		'tar' => 'application/gtar',
//		'tar' => 'application/x-tar',
//		'tgz' => 'application/x-gzip',
		'torrent' => 'application/x-bittorrent',
		'wgt' => 'application/widget',
		'xls' => 'application/vnd.ms-excel',
		'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'xltx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
		'zip' => 'application/zip',

		'aac' => 'audio/aac',
		'aif' => 'audio/aiff',
		'aifc' => 'audio/aiff',
		'aiff' => 'audio/aiff',
		'flac' => 'audio/flac',
		'm3u' => 'audio/x-mpegurl',
		'midi' => 'audio/midi',
		'mp3' => 'audio/mpeg',
		'mp4a' => 'audio/mp4',
		'ogg' => 'audio/ogg',
		'wav' => 'audio/wav',
		'weba' => 'audio/webm',

		'ttf' => 'font/ttf',
		'woff' => 'font/woff',
		'woff2' => 'font/woff2',

		'bmp' => 'image/bmp',
		'cgm' => 'image/cgm',
		'djv' => 'image/vnd.djvu',
		'djvu' => 'image/vnd.djvu',
		'gif' => 'image/gif',
//		'heic' => 'image/heic',
		'ico' => 'image/vnd.microsoft.icon',
//		'ico' => 'image/x-icon',
		'ief' => 'image/ief',
		'jpeg' => 'image/jpeg',
		'jfif' => 'image/jpeg',
		'jpe' => 'image/jpeg',
		'jpg' => 'image/jpeg',
		'png' => 'image/png',
		'svg' => 'image/svg+xml',
		'svgz' => 'image/svg+xml',
		'tiff' => 'image/tiff',
		'tif' => 'image/tiff',
		'webp' => 'image/webp',

		'eml' => 'message/rfc822',
		'mime' => 'message/rfc822',

		'txt' => 'text/plain',
		'asp' => 'text/asp',
		'cfg' => 'text/plain',
		'conf' => 'text/plain',
		'css' => 'text/css',
		'csv' => 'text/csv',
		'def' => 'text/plain',
		'html' => 'text/html',
		'htm' => 'text/html',
		'ics' => 'text/calendar',
		'ifb' => 'text/calendar',
		'in' => 'text/plain',
		'ini' => 'text/plain',
		'list' => 'text/plain',
		'log' => 'text/plain',
		'pl' => 'text/perl',
		'rtx' => 'text/richtext',
		'text' => 'text/plain',
		'vcf' => 'text/vcard',
		'vcard' => 'text/vcard',
		'xml' => 'text/xml',

		'3g2' => 'video/3gpp2',
		'3gp' => 'video/3gpp',
		'asf' => 'video/x-ms-asf',
		'asx' => 'video/x-ms-asf',
		'avi' => 'video/x-msvideo',
		'flv' => 'video/flv',
		'h261' => 'video/h261',
		'h263' => 'video/h263',
		'h264' => 'video/h264',
		'jpgv' => 'video/jpgv',
		'm4v' => 'video/x-m4v',
		'mov' => 'video/quicktime',
		'movie' => 'video/x-sgi-movie',
		'mp4' => 'video/mp4',
		'mp4v' => 'video/mp4',
		'mpeg' => 'video/mpeg',
		'm1v' => 'video/mpeg',
		'm2v' => 'video/mpeg',
		'mpe' => 'video/mpeg',
		'mpg' => 'video/mpeg',
		'mpg4' => 'video/mp4',
		'ogv' => 'video/ogg',
		'qt' => 'video/quicktime',
		'webm' => 'video/webm',
		'wm' => 'video/x-ms-wm',
		'wmv' => 'video/x-ms-wmv',
		'wmx' => 'video/x-ms-wmx',
		'wvx' => 'video/x-ms-wvx',
	];

}
