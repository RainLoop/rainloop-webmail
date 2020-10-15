<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
abstract class Collection extends \ArrayObject
{
	function __construct($input = array(), int $flags = 0, string $iterator_class = "ArrayIterator")
	{
		parent::__construct();
		foreach ($input as $item) {
			$this->append($item);
		}
	}

	/**
	 * @param mixed $mItem
	 */
	public function append($mItem, bool $bToTop = false) : void
	{
		if ($bToTop) {
			$array = $this->getArrayCopy();
			array_unshift($array, $mItem);
			$this->exchangeArray($array);
		} else {
			parent::append($mItem);
		}
	}

	public function Add($mItem, bool $bToTop = false) : self
	{
		$this->append($mItem, $bToTop);
		return $this;
	}

	public function Clear() : void
	{
		$this->exchangeArray([]);
	}

	public function Slice(int $offset, int $length = null, bool $preserve_keys = false)
	{
		return new static(
			array_slice($this->getArrayCopy(), $offset, $length, $preserve_keys)
		);
	}

	public function Crop(int $length = null, int $offset = 0, bool $preserve_keys = false)
	{
		$this->exchangeArray(
			array_slice($this->getArrayCopy(), $offset, $length, $preserve_keys)
		);
		return $this;
	}
}
