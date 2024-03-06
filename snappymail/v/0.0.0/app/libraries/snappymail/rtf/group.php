<?php

namespace SnappyMail\Rtf;

class Group implements Entity
{
	public ?Group $parent = null;
	public array $children = []; // Entities

	public function getType()
	{
		if (isset($this->children[0])) {
			$child = $this->children[0];

			// If the first child is a control word, then
			// the group type is the word.
			if ($child instanceof ControlWord) {
				return $child->word;
			}

			// If the first child is a control symbol, then
			// the group type is * for a special symbol, or null.
			if ($child instanceof ControlSymbol) {
				return ('*' === $child->symbol) ? '*' : null;
			}
		}

		// If first child is neither word nor symbol, then
		// group type is null.
		return null;
	}
}
