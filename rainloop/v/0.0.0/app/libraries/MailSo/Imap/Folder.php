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
	private $aExtended;

	/**
	 * @access private
	 *
	 * @param string $sFullNameRaw
	 * @param string $sDelimiter
	 * @param array $aFlags
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	private function __construct($sFullNameRaw, $sDelimiter, array $aFlags)
	{
		$this->sNameRaw = '';
		$this->sFullNameRaw = '';
		$this->sDelimiter = '';
		$this->aFlags = array();
		$this->aExtended = array();

		$sDelimiter = 'NIL' === \strtoupper($sDelimiter) ? '' : $sDelimiter;
		if (empty($sDelimiter))
		{
			$sDelimiter = '.'; // default delimiter
		}

		if (!\is_array($aFlags) ||
			!\is_string($sDelimiter) || 1 < \strlen($sDelimiter) ||
			!\is_string($sFullNameRaw) || 0 === \strlen($sFullNameRaw))
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
	 * @param string $sFullNameRaw
	 * @param string $sDelimiter = '.'
	 * @param array $aFlags = array()
	 *
	 * @return \MailSo\Imap\Folder
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public static function NewInstance($sFullNameRaw, $sDelimiter = '.', $aFlags = array())
	{
		return new self($sFullNameRaw, $sDelimiter, $aFlags);
	}

	/**
	 * @return string
	 */
	public function NameRaw()
	{
		return $this->sNameRaw;
	}

	/**
	 * @return string
	 */
	public function FullNameRaw()
	{
		return $this->sFullNameRaw;
	}

	/**
	 * @return string | null
	 */
	public function Delimiter()
	{
		return $this->sDelimiter;
	}

	/**
	 * @return array
	 */
	public function Flags()
	{
		return $this->aFlags;
	}

	/**
	 * @return array
	 */
	public function FlagsLowerCase()
	{
		return $this->aFlagsLowerCase;
	}

	/**
	 * @return bool
	 */
	public function IsSelectable()
	{
		return !\in_array('\noselect', $this->aFlagsLowerCase);
	}

	/**
	 * @return bool
	 */
	public function IsInbox()
	{
		return 'INBOX' === \strtoupper($this->sFullNameRaw) || \in_array('\inbox', $this->aFlagsLowerCase);
	}

	/**
	 * @param string $sName
	 * @param mixed $mData
	 */
	public function SetExtended($sName, $mData)
	{
		$this->aExtended[$sName] = $mData;
	}

	/**
	 * @param string $sName
	 * @return mixed
	 */
	public function GetExtended($sName)
	{
		return isset($this->aExtended[$sName]) ? $this->aExtended[$sName] : null;
	}
}
