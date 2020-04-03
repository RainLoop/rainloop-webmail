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
class Folder
{
	/**
	 * @var string
	 */
	private $sNameRaw;

	/**
	 * @var string
	 */
	private $sFullNameRaw;

	/**
	 * @var string
	 */
	private $sDelimiter;

	/**
	 * @var array
	 */
	private $aFlags;

	/**
	 * @var array
	 */
	private $aFlagsLowerCase;

	/**
	 * @var array
	 */
	private $aExtended = array();

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	private function __construct(string $sFullNameRaw, string $sDelimiter, array $aFlags)
	{
		$sDelimiter = 'NIL' === \strtoupper($sDelimiter) ? '' : $sDelimiter;
		if (empty($sDelimiter))
		{
			$sDelimiter = '.'; // default delimiter
		}

		if (1 < \strlen($sDelimiter) || 0 === \strlen($sFullNameRaw))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		$this->sFullNameRaw = $sFullNameRaw;
		$this->sDelimiter = $sDelimiter;
		$this->aFlags = $aFlags;
		$this->aFlagsLowerCase = \array_map('strtolower', $this->aFlags);

		$this->sFullNameRaw = 'INBOX'.$this->sDelimiter === \substr(\strtoupper($this->sFullNameRaw), 0, 5 + \strlen($this->sDelimiter)) ?
			'INBOX'.\substr($this->sFullNameRaw, 5) : $this->sFullNameRaw;

		if ($this->IsInbox())
		{
			$this->sFullNameRaw = 'INBOX';
		}

		$this->sNameRaw = $this->sFullNameRaw;
		if (0 < \strlen($this->sDelimiter))
		{
			$aNames = \explode($this->sDelimiter, $this->sFullNameRaw);
			if (false !== \array_search('', $aNames))
			{
				throw new \MailSo\Base\Exceptions\InvalidArgumentException();
			}

			$this->sNameRaw = \end($aNames);
		}
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public static function NewInstance(string $sFullNameRaw, string $sDelimiter = '.', array $aFlags = array()) : self
	{
		return new self($sFullNameRaw, $sDelimiter, $aFlags);
	}

	public function NameRaw() : string
	{
		return $this->sNameRaw;
	}

	public function FullNameRaw() : string
	{
		return $this->sFullNameRaw;
	}

	public function Delimiter() : string
	{
		return $this->sDelimiter;
	}

	public function Flags() : array
	{
		return $this->aFlags;
	}

	public function FlagsLowerCase() : array
	{
		return $this->aFlagsLowerCase;
	}

	public function IsSelectable() : bool
	{
		return !\in_array('\noselect', $this->aFlagsLowerCase);
	}

	public function IsInbox() : bool
	{
		return 'INBOX' === \strtoupper($this->sFullNameRaw) || \in_array('\inbox', $this->aFlagsLowerCase);
	}

	/**
	 * @param mixed $mData
	 */
	public function SetExtended(string $sName, $mData) : void
	{
		$this->aExtended[$sName] = $mData;
	}

	/**
	 * @return mixed
	 */
	public function GetExtended(string $sName)
	{
		return isset($this->aExtended[$sName]) ? $this->aExtended[$sName] : null;
	}
}
