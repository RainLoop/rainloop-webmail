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

use MailSo\Imap\Enumerations\ResponseType;

/**
 * @category MailSo
 * @package Imap
 */
class Response
{
	/**
	 * @var array
	 */
	public $ResponseList = array();

	/**
	 * @var array | null
	 */
	public $OptionalResponse = null;

	/**
	 * @var string
	 */
	public $StatusOrIndex;

	/**
	 * @var string
	 */
	public $HumanReadable = '';

	/**
	 * @var bool
	 */
	public $IsStatusResponse = false;

	/**
	 * @var int
	 */
	public $ResponseType = 0;

	/**
	 * @var string
	 */
	public $Tag;

	private function recToLine(array $aList) : string
	{
		$aResult = array();
		foreach ($aList as $mItem)
		{
			$aResult[] = \is_array($mItem) ? '('.$this->recToLine($mItem).')' : (string) $mItem;
		}
		return \implode(' ', $aResult);
	}

	public function setStatus(string $value) : void
	{
		$value = \strtoupper($value);
		$this->StatusOrIndex = $value;
		$this->IsStatusResponse = \defined("\\MailSo\\Imap\\Enumerations\\ResponseStatus::{$value}");
	}

	public function setTag(string $value) : void
	{
		$this->Tag = $value;
		if ('+' === $value) {
			$this->ResponseType = ResponseType::CONTINUATION;
		} else if ('*' === $value) {
			$this->ResponseType = ResponseType::UNTAGGED;
		} else {
			$this->ResponseType = ResponseType::UNKNOWN;
		}
	}

	public function ToLine() : string
	{
		return $this->recToLine($this->ResponseList);
	}
}
