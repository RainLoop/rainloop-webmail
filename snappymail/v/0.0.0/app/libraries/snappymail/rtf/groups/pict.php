<?php

namespace SnappyMail\Rtf\Groups;

use SnappyMail\Rtf\ControlWord;
use SnappyMail\Rtf\Group;
use SnappyMail\Rtf\Text;

class Pict extends Group
{
	public function getHTML(): string
	{
		$format = 'bmp';
		$style = [];
		$binarySize = 0; // Number of bytes of the binary data
		$data = null;    // Binary or Hexadecimal Data

		foreach ($this->children as $child) {
			if ($child instanceof ControlWord) {
				switch ($child->word) {
					// Picture Format
					case 'emfblip':
					case 'pngblip':
					case 'jpegblip':
						$format = \substr($child->word, 0, -4);
						break;
					case 'macpict':
						$format = 'pict';
						break;
//					case 'wmetafile': $format = 'bmp'; break;

					// Picture size and scaling
					case 'picw':
						$style[] = "width:{$child->parameter}px";
						break;
					case 'pich':
						$style[] = "height:{$child->parameter}px";
						break;
					case 'picscalex':
//						$style[] = "width:{$child->parameter}%";
						break;
					case 'picscaley':
//						$style[] = "height:{$child->parameter}%";
						break;

					// Binary or Hexadecimal Data ?
					case 'bin': $binarySize = $child->parameter; break;
					default: break;
				}

			} elseif ($child instanceof Text) { // store Data
				$data = $child->text;
			}
		}

		if ($binarySize) {
			$data = \substr($data, 0, $binarySize);
		} else {
			$data = \pack('H*',$data);
		}

		if ($style) {
			$style = ' style="' . \implode(';', $style) . '"';
		}

		return "<img{$style} src=\"data:image/{$format};base64," . \base64_encode($data) . "\"/>";
	}
}
