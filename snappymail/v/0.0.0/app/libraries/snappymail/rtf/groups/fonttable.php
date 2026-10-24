<?php

namespace SnappyMail\Rtf\Groups;

use SnappyMail\Rtf\FontInfo;
use SnappyMail\Rtf\Group;

/**
 * <fonttbl>       '{' \fonttbl (<fontinfo> | ('{' <fontinfo> '}'))+ '}'
 * <fontinfo>      <themefont>? \fN <fontfamily> \fcharsetN? \fprq? <panose>? <nontaggedname>? <fontemb>? \cpgN? <fontname> <fontaltname>? ';'
 * <themefont>     \flomajor | \fhimajor | \fdbmajor | \fbimajor | \flominor | \fhiminor | \fdbminor | \fbiminor
 * <fontfamily>    \fnil | \froman | \fswiss | \fmodern | \fscript | \fdecor | \ftech | \fbidi
 * <panose>        '{\*' \panose <data> '}'
 * <nontaggedname> '{\*' \fname #PCDATA ';}'
 * <fontname>      #PCDATA
 * <fontaltname>   '{\*' \falt #PCDATA '}'
 * <fontemb>       '{\*' \fontemb <fonttype> <fontfname>? <data>? '}'
 * <fonttype>      \ftnil | \fttruetype
 * <fontfname>     '{\*' \fontfile \cpgN? #PCDATA '}'
 */
class FontTable extends Group
{
	public function getFonts(): array
	{
		$fonts = [];
		$basefont = null;
		foreach ($this->children as $fontinfo) {
			if ($fontinfo instanceof Group) {
				$font = new FontInfo();
				foreach ($fontinfo->children as $entity) {
					$font->addEntity($entity);
				}
				$fonts[$font->uid] = $font;
			} else {
				$basefont = $basefont ?: new FontInfo();
				$basefont->addEntity($fontinfo);
			}
		}
		if ($basefont && !$fonts) {
			$fonts[$basefont->uid] = $basefont;
		}
		return $fonts;
	}
}
