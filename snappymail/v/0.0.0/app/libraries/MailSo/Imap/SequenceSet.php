<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2022 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Messages in IMAP4rev1 are accessed by the use of numbers.
 * These numbers are either message sequence numbers or unique identifiers.
 * https://datatracker.ietf.org/doc/html/rfc3501#section-2.3.1
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Mail
 */
class SequenceSet /*extends \SplFixedArray*/ implements \Countable
{
	/**
	 * By default the numbers are unique identifiers as this is more reliable.
	 */
	public bool $UID = true;

	private array $data = [];

	/**
	 * @param mixed $mItems Can be array, string or int
	 */
	public function __construct($mItems, bool $uid = true)
	{
		if (\is_array($mItems)) {
			$this->data = \array_values($uid ? \array_filter(\array_map(function($id){
				return \preg_match('/^([0-9]+|\\*):([0-9]+|\\*)/', $id, $dummy) ? $id : \intval($id);
			}, $mItems)) : $mItems);
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

	public function indexOf($value)/*: int|false*/
	{
		return \array_search($value, $this->data);
	}

	public function getArrayCopy(): array
	{
		return $this->data;
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
