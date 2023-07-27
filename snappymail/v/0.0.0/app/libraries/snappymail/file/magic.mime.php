<?php
$magic = array(
	'#^\x37\x7A.*#s'          => 'application/x-7z-compressed', # unknown by magic.mime
	'#^BZh.*#s'               => 'application/x-bzip2',
	'#^\x1f\x8b.*#s'          => 'application/x-gzip',
	'#^.{257}ustar  \x00.*#s' => 'application/x-gtar',
	'#^.{257}ustar\x00.*#s'   => 'application/x-tar',
	'#^Rar!.*#s'              => 'application/x-rar-compressed',
	'#^PK\x03\x04.*#s'        => 'application/zip',

	'#^%PDF-.*#s'  => 'application/pdf',
	'#^[CF]WS.*#s' => 'application/x-shockwave-flash',

	'#^(.*\n)?(INSERT|CREATE|DROP|DELETE|ALTER|UPDATE)\ .*#is' => 'text/x-sql',
	'#^BEGIN:VCARD#s' => 'text/x-vcard',

	'#^GIF8.*#s'       => 'image/gif',
	'#^.{8}heic#s'     => 'image/heic', // https://nokiatech.github.io/heif/technical.html
	'#^\xFF\xD8.*#s'   => 'image/jpeg',
	'#^\x89PNG.*#s'    => 'image/png',
	'#^.PNG.*#s'       => 'image/png',
	'#^<svg.*#s'       => 'image/svg+xml', # wild guess, unknown by magic.mime
	'#^RIFF.{4}WEBP#s' => 'image/webp',

	'#^FLV.*#s'      => 'video/x-flv',
	'#^OggS.+\x80theora.*#s' => 'video/ogg',

	'#^ID3.*#s'      => 'audio/mpeg', # wild guess?
	'#^\xff\xfa.*#s' => 'audio/mpeg', # wild guess?
	'#^OggS.+\x01vorbis.*#s' => 'audio/ogg',

	'#^\xD0\xCF\x11\xE0\xA1.*#s' => 'application/msword',
	'#^OggS.*#s'     => 'application/ogg',
);
