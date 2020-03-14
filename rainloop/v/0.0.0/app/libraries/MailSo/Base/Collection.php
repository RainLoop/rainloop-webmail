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
abstract class Collection
{
	/**
	 * @var array
	 */
	protected $aItems;

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		$this->aItems = array();
	}

	/**
	 * @param mixed $mItem
	 * @return self
	 */
	public function Add($mItem, bool $bToTop = false)
	{
		if ($bToTop)
		{
			\array_unshift($this->aItems, $mItem);
		}
		else
		{
			\array_push($this->aItems, $mItem);
		}

		return $this;
	}

	/**
	 * @return self
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function AddArray(array $aItems)
	{
		if (!\is_array($aItems))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		foreach ($aItems as $mItem)
		{
			$this->Add($mItem);
		}

		return $this;
	}

	/**
	 * @return self
	 */
	public function Clear()
	{
		$this->aItems = array();

		return $this;
	}

	public function CloneAsArray() : array
	{
		return $this->aItems;
	}

	public function Count() : int
	{
		return \count($this->aItems);
	}

	public function &GetAsArray() : array
	{
		return $this->aItems;
	}

	/**
	 * @param mixed $mCallback
	 */
	public function MapList($mCallback)
	{
		$aResult = array();
		if (\is_callable($mCallback))
		{
			foreach ($this->aItems as $oItem)
			{
				$aResult[] = \call_user_func($mCallback, $oItem);
			}
		}

		return $aResult;
	}

	/**
	 * @param mixed $mCallback
	 */
	public function FilterList($mCallback) : array
	{
		$aResult = array();
		if (\is_callable($mCallback))
		{
			foreach ($this->aItems as $oItem)
			{
				if (\call_user_func($mCallback, $oItem))
				{
					$aResult[] = $oItem;
				}
			}
		}

		return $aResult;
	}

	/**
	 * @param mixed $mCallback
	 */
	public function ForeachList($mCallback) : void
	{
		if (\is_callable($mCallback))
		{
			foreach ($this->aItems as $oItem)
			{
				\call_user_func($mCallback, $oItem);
			}
		}
	}

	/**
	 * @return mixed | null
	 * @return mixed
	 */
	public function &GetByIndex(int $iIndex)
	{
		$mResult = null;
		if (\key_exists($iIndex, $this->aItems))
		{
			$mResult = $this->aItems[$iIndex];
		}

		return $mResult;
	}

	/**
	 * @return self
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetAsArray(array $aItems)
	{
		if (!\is_array($aItems))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		$this->aItems = $aItems;

		return $this;
	}
}
