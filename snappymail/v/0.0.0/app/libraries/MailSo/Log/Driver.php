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
	/**
	 * @var string
	 */
	protected $sDatePattern;

	/**
	 * @var string
	 */
	protected $sName;

	/**
	 * @var array
	 */
	protected $aPrefixes;

	/**
	 * @var bool
	 */
	protected $bGuidPrefix;

	/**
	 * @var DateTimeZone
	 */
	protected $oTimeZone;

	/**
	 * @var bool
	 */
	protected $bTimePrefix;

	/**
	 * @var bool
	 */
	protected $bTypedPrefix;

	/**
	 * @var string
	 */
	protected $sNewLine;

	/**
	 * @var int
	 */
	private $iWriteOnTimeoutOnly;

	/**
	 * @var bool
	 */
	private $bWriteOnErrorOnly;

	/**
	 * @var bool
	 */
	private $bWriteOnPhpErrorOnly;

	/**
	 * @var bool
	 */
	private $bFlushCache;

	/**
	 * @var array
	 */
	private $aCache;

	function __construct()
	{
		$this->sDatePattern = 'H:i:s';
		$this->sName = 'INFO';
		$this->sNewLine = "\r\n";
		$this->bTimePrefix = true;
		$this->bTypedPrefix = true;
		$this->bGuidPrefix = true;

		$this->oTimeZone = new \DateTimeZone('UTC');

		$this->iWriteOnTimeoutOnly = 0;
		$this->bWriteOnErrorOnly = false;
		$this->bWriteOnPhpErrorOnly = false;
		$this->bFlushCache = false;
		$this->aCache = array();

		$this->aPrefixes = array(
			\MailSo\Log\Enumerations\Type::INFO => '[DATA]',
			\MailSo\Log\Enumerations\Type::SECURE => '[SECURE]',
			\MailSo\Log\Enumerations\Type::NOTE => '[NOTE]',
			\MailSo\Log\Enumerations\Type::TIME => '[TIME]',
			\MailSo\Log\Enumerations\Type::TIME_DELTA => '[TIME]',
			\MailSo\Log\Enumerations\Type::MEMORY => '[MEMORY]',
			\MailSo\Log\Enumerations\Type::NOTICE => '[NOTICE]',
			\MailSo\Log\Enumerations\Type::WARNING => '[WARNING]',
			\MailSo\Log\Enumerations\Type::ERROR => '[ERROR]',

			\MailSo\Log\Enumerations\Type::NOTICE_PHP => '[NOTICE]',
			\MailSo\Log\Enumerations\Type::WARNING_PHP => '[WARNING]',
			\MailSo\Log\Enumerations\Type::ERROR_PHP => '[ERROR]',
		);
	}

	public function SetTimeZone(/*\DateTimeZone | string*/ $oTimeZone) : self
	{
		if ($oTimeZone instanceof \DateTimeZone) {
			$this->oTimeZone = $oTimeZone;
		} else {
			$this->oTimeZone = new \DateTimeZone($oTimeZone);
		}
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

	public function WriteOnErrorOnly(bool $bValue) : self
	{
		$this->bWriteOnErrorOnly = !!$bValue;
		return $this;
	}

	public function WriteOnPhpErrorOnly(bool $bValue) : self
	{
		$this->bWriteOnPhpErrorOnly = !!$bValue;
		return $this;
	}

	public function WriteOnTimeoutOnly(int $iTimeout) : self
	{
		$this->iWriteOnTimeoutOnly = (int) $iTimeout;
		if (0 > $this->iWriteOnTimeoutOnly)
		{
			$this->iWriteOnTimeoutOnly = 0;
		}

		return $this;
	}

	public function DisableTypedPrefix() : self
	{
		$this->bTypedPrefix = false;
		return $this;
	}

	abstract protected function writeImplementation($mDesc) : bool;

	protected function writeEmptyLineImplementation() : bool
	{
		return $this->writeImplementation('');
	}

	protected function loggerLineImplementation(string $sTimePrefix, string $sDesc,
		int $iType = \MailSo\Log\Enumerations\Type::INFO, string $sName = '') : string
	{
		return \ltrim(
			($this->bTimePrefix ? '['.$sTimePrefix.']' : '').
			($this->bGuidPrefix ? '['.Logger::Guid().']' : '').
			($this->bTypedPrefix ? ' '.$this->getTypedPrefix($iType, $sName) : '')
		).$sDesc;
	}

	protected function clearImplementation() : bool
	{
		return true;
	}

	protected function getTimeWithMicroSec() : string
	{
		return \substr((new \DateTime('now', $this->DateTimeZone))->format('Y-m-d H:i:s.u'), 0, -3);
	}

	protected function getTypedPrefix(int $iType, string $sName = '') : string
	{
		$sName = 0 < \strlen($sName) ? $sName : $this->sName;
		return isset($this->aPrefixes[$iType]) ? $sName.$this->aPrefixes[$iType].': ' : '';
	}

	protected function localWriteImplementation($mDesc, bool $bDiplayCrLf = false) : string
	{
		if ($bDiplayCrLf)
		{
			if (\is_array($mDesc))
			{
				foreach ($mDesc as &$sLine)
				{
					$sLine = \strtr($sLine, array("\r" => '\r', "\n" => '\n'.$this->sNewLine));
					$sLine = \rtrim($sLine);
				}
			}
			else
			{
				$mDesc = \strtr($mDesc, array("\r" => '\r', "\n" => '\n'.$this->sNewLine));
				$mDesc = \rtrim($mDesc);
			}
		}

		return $this->writeImplementation($mDesc);
	}

	final public function Write(string $sDesc, int $iType = \MailSo\Log\Enumerations\Type::INFO, string $sName = '', bool $bDiplayCrLf = false)
	{
		$bResult = true;
		if (!$this->bFlushCache && ($this->bWriteOnErrorOnly || $this->bWriteOnPhpErrorOnly || 0 < $this->iWriteOnTimeoutOnly))
		{
			$bErrorPhp = false;

			$bError = $this->bWriteOnErrorOnly && \in_array($iType, array(
				\MailSo\Log\Enumerations\Type::NOTICE,
				\MailSo\Log\Enumerations\Type::NOTICE_PHP,
				\MailSo\Log\Enumerations\Type::WARNING,
				\MailSo\Log\Enumerations\Type::WARNING_PHP,
				\MailSo\Log\Enumerations\Type::ERROR,
				\MailSo\Log\Enumerations\Type::ERROR_PHP
			));

			if (!$bError)
			{
				$bErrorPhp = $this->bWriteOnPhpErrorOnly && \in_array($iType, array(
					\MailSo\Log\Enumerations\Type::NOTICE_PHP,
					\MailSo\Log\Enumerations\Type::WARNING_PHP,
					\MailSo\Log\Enumerations\Type::ERROR_PHP
				));
			}

			if ($bError || $bErrorPhp)
			{
				$sFlush = '--- FlushLogCache: '.($bError ? 'WriteOnErrorOnly' : 'WriteOnPhpErrorOnly');
				if (isset($this->aCache[0]) && empty($this->aCache[0]))
				{
					$this->aCache[0] = $sFlush;
					\array_unshift($this->aCache, '');
				}
				else
				{
					\array_unshift($this->aCache, $sFlush);
				}

				$this->aCache[] = '--- FlushLogCache: Trigger';
				$this->aCache[] = $this->loggerLineImplementation($this->getTimeWithMicroSec(), $sDesc, $iType, $sName);

				$this->bFlushCache = true;
				$bResult = $this->localWriteImplementation($this->aCache, $bDiplayCrLf);
				$this->aCache = array();
			}
			else if (0 < $this->iWriteOnTimeoutOnly && \time() - $_SERVER['REQUEST_TIME_FLOAT'] > $this->iWriteOnTimeoutOnly)
			{
				$sFlush = '--- FlushLogCache: WriteOnTimeoutOnly ['.(\time() - $_SERVER['REQUEST_TIME_FLOAT']).'sec]';
				if (isset($this->aCache[0]) && empty($this->aCache[0]))
				{
					$this->aCache[0] = $sFlush;
					\array_unshift($this->aCache, '');
				}
				else
				{
					\array_unshift($this->aCache, $sFlush);
				}

				$this->aCache[] = '--- FlushLogCache: Trigger';
				$this->aCache[] = $this->loggerLineImplementation($this->getTimeWithMicroSec(), $sDesc, $iType, $sName);

				$this->bFlushCache = true;
				$bResult = $this->localWriteImplementation($this->aCache, $bDiplayCrLf);
				$this->aCache = array();
			}
			else
			{
				$this->aCache[] = $this->loggerLineImplementation($this->getTimeWithMicroSec(), $sDesc, $iType, $sName);
			}
		}
		else
		{
			$bResult = $this->localWriteImplementation(
				$this->loggerLineImplementation($this->getTimeWithMicroSec(), $sDesc, $iType, $sName), $bDiplayCrLf);
		}

		return $bResult;
	}

	public function GetNewLine() : string
	{
		return $this->sNewLine;
	}

	final public function Clear() : bool
	{
		return $this->clearImplementation();
	}

	final public function WriteEmptyLine() : void
	{
		if (!$this->bFlushCache && ($this->bWriteOnErrorOnly || $this->bWriteOnPhpErrorOnly || 0 < $this->iWriteOnTimeoutOnly))
		{
			$this->aCache[] = '';
		}
		else
		{
			$this->writeEmptyLineImplementation();
		}
	}
}
