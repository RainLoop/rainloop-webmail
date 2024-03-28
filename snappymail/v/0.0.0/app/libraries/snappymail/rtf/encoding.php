<?php

namespace SnappyMail\Rtf;

abstract class Encoding
{
	public static function getFromCharset(int $fcharset): ?string
	{
		/* maps windows character sets to iconv encoding names */
		$charset = array (
			0   => 'CP1252', // ANSI: Western Europe
			1   => 'CP1252', //*Default
			2   => 'CP1252', //*Symbol
			3   => null,     // Invalid
			77  => 'MAC',    //*also [MacRoman]: Macintosh
			128 => 'CP932',  //*or [Shift_JIS]?: Japanese
			129 => 'CP949',  //*also [UHC]: Korean (Hangul)
			130 => 'CP1361', //*also [JOHAB]: Korean (Johab)
			134 => 'CP936',  //*or [GB2312]?: Simplified Chinese
			136 => 'CP950',  //*or [BIG5]?: Traditional Chinese
			161 => 'CP1253', // Greek
			162 => 'CP1254', // Turkish (latin 5)
			163 => 'CP1258', // Vietnamese
			177 => 'CP1255', // Hebrew
			178 => 'CP1256', // Simplified Arabic
			179 => 'CP1256', //*Traditional Arabic
			180 => 'CP1256', //*Arabic User
			181 => 'CP1255', //*Hebrew User
			186 => 'CP1257', // Baltic
			204 => 'CP1251', // Russian (Cyrillic)
			222 => 'CP874',  // Thai
			238 => 'CP1250', // Eastern European (latin 2)
			254 => 'CP437',  //*also [IBM437][437]: PC437
			255 => 'CP437'   //*OEM still PC437
		);

		if (isset($charset[$fcharset])) {
			return $charset[$fcharset];
		}
		\trigger_error("Unknown charset: {$fcharset}");
		return null;
	}

	public static function getFromCodepage($cpg): ?string
	{
		$codePage = array (
			'ansi' => 'CP1252',
			'mac'  => 'MAC',
			'pc'   => 'CP437',
			'pca'  => 'CP850',
			437 => 'CP437', // United States IBM
			708 => 'ASMO-708', // also [ISO-8859-6][ARABIC] Arabic
			/*	Not supported by iconv
			709, => '' // Arabic (ASMO 449+, BCON V4)
			710, => '' // Arabic (transparent Arabic)
			711, => '' // Arabic (Nafitha Enhanced)
			720, => '' // Arabic (transparent ASMO)
			*/
			819 => 'CP819',   // Windows 3.1 (US and Western Europe)
			850 => 'CP850',   // IBM multilingual
			852 => 'CP852',   // Eastern European
			860 => 'CP860',   // Portuguese
			862 => 'CP862',   // Hebrew
			863 => 'CP863',   // French Canadian
			864 => 'CP864',   // Arabic
			865 => 'CP865',   // Norwegian
			866 => 'CP866',   // Soviet Union
			874 => 'CP874',   // Thai
			932 => 'CP932',   // Japanese
			936 => 'CP936',   // Simplified Chinese
			949 => 'CP949',   // Korean
			950 => 'CP950',   // Traditional Chinese
			1250 => 'CP1250', // Windows 3.1 (Eastern European)
			1251 => 'CP1251', // Windows 3.1 (Cyrillic)
			1252 => 'CP1252', // Western European
			1253 => 'CP1253', // Greek
			1254 => 'CP1254', // Turkish
			1255 => 'CP1255', // Hebrew
			1256 => 'CP1256', // Arabic
			1257 => 'CP1257', // Baltic
			1258 => 'CP1258', // Vietnamese
			1361 => 'CP1361'); // Johab

		if (isset($codePage[$cpg])) {
			return $codePage[$cpg];
		}
		\trigger_error("Unknown codepage: {$cpg}");
		return null;
	}
}
