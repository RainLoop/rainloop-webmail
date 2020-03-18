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
abstract class Collection extends \ArrayObject /*implements \ArrayAccess, \Traversable, \Countable, \Ds\Collection */
{
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

	public function AddArray(array $aItems) : self
	{
		foreach ($aItems as $mItem)
		{
			$this->append($mItem);
		}

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

	public function MapList(callable $cCallback) : array
	{
		$aResult = array();
		if (\is_callable($cCallback))
		{
			foreach ($this as $oItem)
			{
				$aResult[] = \call_user_func($cCallback, $oItem);
			}
		}

		return $aResult;
	}

	public function FilterList(callable $cCallback) : array
	{
		$aResult = array();
		if (\is_callable($cCallback))
		{
			foreach ($this as $oItem)
			{
				if (\call_user_func($cCallback, $oItem))
				{
					$aResult[] = $oItem;
				}
			}
		}

		return $aResult;
	}

	public function ForeachList(callable $cCallback) : void
	{
		if (\is_callable($cCallback))
		{
			foreach ($this as $oItem)
			{
				\call_user_func($cCallback, $oItem);
			}
		}
	}
}
