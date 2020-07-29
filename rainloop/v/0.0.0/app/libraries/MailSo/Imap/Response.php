<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Imap
 */
class Response
{
	/**
	 * @var array
	 */
	public $ResponseList;

	/**
	 * @var array | null
	 */
	public $OptionalResponse;

	/**
	 * @var string
	 */
	public $StatusOrIndex;

	/**
	 * @var string
	 */
	public $HumanReadable;

	/**
	 * @var bool
	 */
	public $IsStatusResponse;

	/**
	 * @var string
	 */
	public $ResponseType;

	/**
	 * @var string
	 */
	public $Tag;

	private function __construct()
	{
		$this->ResponseList = array();
		$this->OptionalResponse = null;
		$this->StatusOrIndex = '';
		$this->HumanReadable = '';
		$this->IsStatusResponse = false;
		$this->ResponseType = \MailSo\Imap\Enumerations\ResponseType::UNKNOWN;
		$this->Tag = '';
	}

	public static function NewInstance() : self
	{
		return new self();
	}

	private function recToLine(array $aList) : string
	{
		$aResult = array();
		foreach ($aList as $mItem)
		{
			$aResult[] = \is_array($mItem) ? '('.$this->recToLine($mItem).')' : (string) $mItem;
		}

		return \implode(' ', $aResult);
	}

	public function ToLine() : string
	{
		return $this->recToLine($this->ResponseList);
	}
}
