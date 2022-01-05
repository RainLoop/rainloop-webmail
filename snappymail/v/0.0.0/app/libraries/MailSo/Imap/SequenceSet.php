<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2022 DJ Maze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Mail
 */
class SequenceSet /*extends \SplFixedArray*/ implements \Countable
{
	public $UID = true;

	private $data = [];

	public function __construct($mItems, bool $uid = true)
	{
		if (\is_array($mItems)) {
			$this->data = $uid ? \array_filter(\array_map(function($id){
				return \preg_match('/^([0-9]+|\\*):([0-9]+|\\*)/', $id, $dummy) ? $id : \intval($id);
			}, $mItems)) : $mItems;
		} else if (\is_scalar($mItems)) {
			$this->data[] = $mItems;
		}
		$this->UID = $uid;
	}

	public function count(): int
	{
		return \count($this->data);
	}

	public function contains($value): bool
	{
		return \in_array($value, $this->data);
	}

	public function __toString(): string
	{
		$aResult = array();
		$iStart = null;
		$iPrev = null;

		foreach ($this->data as $mItem) {
			if (false !== \strpos($mItem, ':')) {
				$aResult[] = $mItem;
				continue;
			}

			if (null === $iStart || null === $iPrev) {
				$iStart = $mItem;
				$iPrev = $mItem;
				continue;
			}

			if ($iPrev === $mItem - 1) {
				$iPrev = $mItem;
			} else {
				$aResult[] = $iStart === $iPrev ? $iStart : $iStart.':'.$iPrev;
				$iStart = $mItem;
				$iPrev = $mItem;
			}
		}

		if (null !== $iStart && null !== $iPrev) {
			$aResult[] = $iStart === $iPrev ? $iStart : $iStart.':'.$iPrev;
		}

		return \implode(',', $aResult);
	}
}
