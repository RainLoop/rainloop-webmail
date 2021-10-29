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
	// RFC5258 Response data STATUS items when using LIST-EXTENDED
	use Traits\Status;

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
	private $aFlagsLowerCase;

	/**
	 * RFC 5464
	 */
	private $aMetadata = array();

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	function __construct(string $sFullNameRaw, string $sDelimiter = null, array $aFlags = array())
	{
		if (!\strlen($sFullNameRaw)) {
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
		}
		$this->sFullNameRaw = $sFullNameRaw;

		$this->setDelimiter($sDelimiter);
		$this->setFlags($aFlags);
	}

	public function setFlags(array $aFlags) : void
	{
		$this->aFlagsLowerCase = \array_map('strtolower', $aFlags);
	}

	public function setDelimiter(?string $sDelimiter) : void
	{
		$sDelimiter = 'NIL' === \strtoupper($sDelimiter) ? null : $sDelimiter;
		$this->sDelimiter = $sDelimiter;
		if ($sDelimiter) {
			$aNames = \explode($this->sDelimiter, $this->sFullNameRaw);
			$this->sNameRaw = \end($aNames);
		} else {
			$this->sNameRaw = $this->sFullNameRaw;
		}
	}

	public function NameRaw() : string
	{
		return $this->sNameRaw;
	}

	public function FullNameRaw() : string
	{
		return $this->sFullNameRaw;
	}

	public function Delimiter() : ?string
	{
		return $this->sDelimiter;
	}

	public function FlagsLowerCase() : array
	{
		return $this->aFlagsLowerCase;
	}

	public function IsSelectable() : bool
	{
		return !\in_array('\\noselect', $this->aFlagsLowerCase) && !\in_array('\\nonexistent', $this->aFlagsLowerCase);
	}

	public function IsInbox() : bool
	{
		return 'INBOX' === \strtoupper($this->sFullNameRaw) || \in_array('\\inbox', $this->aFlagsLowerCase);
	}

	/**
	 * @param mixed $mData
	 */
	public function SetMetadata(string $sName, string $sData) : void
	{
		$this->aMetadata[$sName] = $sData;
	}

	/**
	 * @return mixed
	 */
	public function GetMetadata(string $sName) : ?string
	{
		return isset($this->aMetadata[$sName]) ? $this->aMetadata[$sName] : null;
	}

	/**
	 * @return array
	 */
	public function Metadata() : array
	{
		return $this->aMetadata;
	}
}
