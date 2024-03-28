<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Log;

/**
 * @category MailSo
 * @package Log
 */
abstract class Driver
{
	protected string
		$sDatePattern = 'H:i:s',
		$sName = '';

	/**
	 * @var array
	 */
	const PREFIXES = [
		\LOG_EMERG => '[EMERGENCY]',
		\LOG_ALERT => '[ALERT]',
		\LOG_CRIT => '[CRITICAL]',
		\LOG_ERR => '[ERROR]',
		\LOG_WARNING => '[WARNING]',
		\LOG_NOTICE => '[NOTICE]',
		\LOG_INFO => '[INFO]',
		\LOG_DEBUG => '[DEBUG]'
	];

	protected bool $bGuidPrefix = true;

	protected \DateTimeZone $oTimeZone;

	protected bool $bTimePrefix = true;

	protected bool $bTypedPrefix = true;

	function __construct()
	{
		$this->oTimeZone = new \DateTimeZone('UTC');
	}

	public function SetTimeZone(/*\DateTimeZone | string*/ $mTimeZone) : self
	{
		$this->oTimeZone = $mTimeZone instanceof \DateTimeZone
			? $mTimeZone
			: new \DateTimeZone($mTimeZone);
		return $this;
	}

	public function DisableGuidPrefix() : self
	{
		$this->bGuidPrefix = false;
		return $this;
	}

	public function DisableTimePrefix() : self
	{
		$this->bTimePrefix = false;
		return $this;
	}

	public function DisableTypedPrefix() : self
	{
		$this->bTypedPrefix = false;
		return $this;
	}

	abstract protected function writeImplementation($mDesc) : bool;

	protected function clearImplementation() : bool
	{
		return true;
	}

	protected function getTimeWithMicroSec() : string
	{
		return \substr((new \DateTime('now', $this->oTimeZone))->format('Y-m-d H:i:s.u'), 0, -3);
	}

	protected function getTypedPrefix(int $iType, string $sName = '') : string
	{
		$sName = \strlen($sName) ? $sName : $this->sName;
		return isset(self::PREFIXES[$iType]) ? $sName . self::PREFIXES[$iType].': ' : '';
	}

	final public function Write(string $sDesc, int $iType = \LOG_INFO, string $sName = '', bool $bDiplayCrLf = false)
	{
		$sDesc = \ltrim(
			($this->bTimePrefix ? '['.$this->getTimeWithMicroSec().']' : '').
			($this->bGuidPrefix ? '['.Logger::Guid().']' : '').
			($this->bTypedPrefix ? ' '.$this->getTypedPrefix($iType, $sName) : '')
		) . $sDesc;
		if ($bDiplayCrLf) {
			$sDesc = \rtrim(\strtr($sDesc, array("\r" => '\r', "\n" => '\n'."\n")));
		}
		return $this->writeImplementation($sDesc);
	}

	final public function Clear() : bool
	{
		return $this->clearImplementation();
	}
}
