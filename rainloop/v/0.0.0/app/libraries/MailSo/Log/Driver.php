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
	 * @var string
	 */
	protected $sTimeOffset;

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

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		$this->sDatePattern = 'H:i:s';
		$this->sName = 'INFO';
		$this->sNewLine = "\r\n";
		$this->bTimePrefix = true;
		$this->bTypedPrefix = true;
		$this->bGuidPrefix = true;

		$this->sTimeOffset = '0';

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

	/**
	 * @param string $sTimeOffset
	 *
	 * @return \MailSo\Log\Driver
	 */
	public function SetTimeOffset($sTimeOffset)
	{
		$this->sTimeOffset = (string) $sTimeOffset;
		return $this;
	}

	/**
	 * @return \MailSo\Log\Driver
	 */
	public function DisableGuidPrefix()
	{
		$this->bGuidPrefix = false;
		return $this;
	}

	/**
	 * @return \MailSo\Log\Driver
	 */
	public function DisableTimePrefix()
	{
		$this->bTimePrefix = false;
		return $this;
	}

	/**
	 * @param bool $bValue
	 *
	 * @return \MailSo\Log\Driver
	 */
	public function WriteOnErrorOnly($bValue)
	{
		$this->bWriteOnErrorOnly = !!$bValue;
		return $this;
	}

	/**
	 * @param bool $bValue
	 *
	 * @return \MailSo\Log\Driver
	 */
	public function WriteOnPhpErrorOnly($bValue)
	{
		$this->bWriteOnPhpErrorOnly = !!$bValue;
		return $this;
	}

	/**
	 * @param int $iTimeout
	 *
	 * @return \MailSo\Log\Driver
	 */
	public function WriteOnTimeoutOnly($iTimeout)
	{
		$this->iWriteOnTimeoutOnly = (int) $iTimeout;
		if (0 > $this->iWriteOnTimeoutOnly)
		{
			$this->iWriteOnTimeoutOnly = 0;
		}

		return $this;
	}

	/**
	 * @return \MailSo\Log\Driver
	 */
	public function DisableTypedPrefix()
	{
		$this->bTypedPrefix = false;
		return $this;
	}

	/**
	 * @param string|array $mDesc
	 * @return bool
	 */
	abstract protected function writeImplementation($mDesc);

	/**
	 * @return bool
	 */
	protected function writeEmptyLineImplementation()
	{
		return $this->writeImplementation('');
	}

	/**
	 * @param string $sTimePrefix
	 * @param string $sDesc
	 * @param int $iType = \MailSo\Log\Enumerations\Type::INFO
	 * @param array $sName = ''
	 *
	 * @return string
	 */
	protected function loggerLineImplementation($sTimePrefix, $sDesc,
		$iType = \MailSo\Log\Enumerations\Type::INFO, $sName = '')
	{
		return \ltrim(
			($this->bTimePrefix ? '['.$sTimePrefix.']' : '').
			($this->bGuidPrefix ? '['.\MailSo\Log\Logger::Guid().']' : '').
			($this->bTypedPrefix ? ' '.$this->getTypedPrefix($iType, $sName) : '')
		).$sDesc;
	}

	/**
	 * @return bool
	 */
	protected function clearImplementation()
	{
		return true;
	}

	/**
	 * @return string
	 */
	protected function getTimeWithMicroSec()
	{
		$aMicroTimeItems = \explode(' ', \microtime());
		return \MailSo\Log\Logger::DateHelper($this->sDatePattern, $this->sTimeOffset, $aMicroTimeItems[1]).'.'.
			\str_pad((int) ($aMicroTimeItems[0] * 1000), 3, '0', STR_PAD_LEFT);
	}

	/**
	 * @param int $iType
	 * @param string $sName = ''
	 *
	 * @return string
	 */
	protected function getTypedPrefix($iType, $sName = '')
	{
		$sName = 0 < \strlen($sName) ? $sName : $this->sName;
		return isset($this->aPrefixes[$iType]) ? $sName.$this->aPrefixes[$iType].': ' : '';
	}

	/**
	 * @param string|array $mDesc
	 * @param bool $bDiplayCrLf = false
	 *
	 * @return string
	 */
	protected function localWriteImplementation($mDesc, $bDiplayCrLf = false)
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

	/**
	 * @final
	 * @param string $sDesc
	 * @param int $iType = \MailSo\Log\Enumerations\Type::INFO
	 * @param string $sName = ''
	 * @param bool $bDiplayCrLf = false
	 *
	 * @return bool
	 */
	final public function Write($sDesc, $iType = \MailSo\Log\Enumerations\Type::INFO, $sName = '', $bDiplayCrLf = false)
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
			else if (0 < $this->iWriteOnTimeoutOnly && \time() - APP_START_TIME > $this->iWriteOnTimeoutOnly)
			{
				$sFlush = '--- FlushLogCache: WriteOnTimeoutOnly ['.(\time() - APP_START_TIME).'sec]';
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

	/**
	 * @return string
	 */
	public function GetNewLine()
	{
		return $this->sNewLine;
	}

	/**
	 * @final
	 * @return bool
	 */
	final public function Clear()
	{
		return $this->clearImplementation();
	}

	/**
	 * @final
	 * @return void
	 */
	final public function WriteEmptyLine()
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
