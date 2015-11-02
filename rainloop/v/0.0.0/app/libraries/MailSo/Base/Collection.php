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
	 * @param bool $bToTop = false
	 * @return self
	 */
	public function Add($mItem, $bToTop = false)
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
	 * @param array $aItems
	 * @return self
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function AddArray($aItems)
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

	/**
	 * @return array
	 */
	public function CloneAsArray()
	{
		return $this->aItems;
	}

	/**
	 * @return int
	 */
	public function Count()
	{
		return \count($this->aItems);
	}

	/**
	 * @return array
	 */
	public function &GetAsArray()
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
	 * @return array
	 */
	public function FilterList($mCallback)
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
	 * @return void
	 */
	public function ForeachList($mCallback)
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
	public function &GetByIndex($iIndex)
	{
		$mResult = null;
		if (\key_exists($iIndex, $this->aItems))
		{
			$mResult = $this->aItems[$iIndex];
		}

		return $mResult;
	}

	/**
	 * @param array $aItems
	 * @return self
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetAsArray($aItems)
	{
		if (!\is_array($aItems))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		$this->aItems = $aItems;

		return $this;
	}
}
