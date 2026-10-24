<?php

namespace SnappyMail\Rtf;

class FontInfo implements \Stringable
{
	public string
		$family = '',
		$name = '',
		$charset = '',
		$codepage = '';
	public int
		$uid = 0,
		$fprq = 0; // 0 = Default pitch, 1 = Fixed pitch, 2 = Variable pitch

	public function addEntity(Entity $entity): void
	{
		if ($entity instanceof ControlWord){
			switch ($entity->word) {
				case 'f':
					$this->uid = $entity->parameter;
					break;

				// <fontfamily>
				case 'froman':	$this->family = 'serif';      break;
				case 'fswiss':	$this->family = 'sans-serif'; break;
				case 'fmodern': $this->family = 'monospace';  break;
				case 'fscript': $this->family = 'cursive';    break;
				case 'fdecor':	$this->family = 'fantasy';    break;
				// case 'fnil': break; // default font
				// case 'ftech': break; // symbol
				// case 'fbidi': break; // bidirectional font

				case 'fcharset':
					$this->charset = Encoding::getFromCharset($entity->parameter);
					break;

				case 'fprq':
					$this->fprq = $entity->parameter;
					break;

				case 'cpg':
					$this->codepage = Encoding::getFromCodepage($entity->parameter);
					break;
			}
		}

		// <fontname>
		else if ($entity instanceof Text) {
			// Store font name (except ; delimiter at end)
			$this->name = \substr($entity->text, 0, -1);
		}

		/*
		else if ($entity instanceof Group) {
			// possible subgroups:
			// <panose>
			// <nontaggedname>
			// <fontaltname>
			// <fontemb>
			// <fontfname>
		}
		*/
	}

	public function __toString(): string
	{
		$list = [];
		if ($this->name) {
			// If the name has double quotes replace them with single quotes
			$this->name = \str_replace('"', "'", $this->name);
			$list[] = $this->name;
		}
		if ($this->family) {
			$list[] = $this->family;
		}
		return $list ? 'font-family:' . \implode(', ', $list) : '';
	}
}
