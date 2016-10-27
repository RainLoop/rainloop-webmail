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
class Logger extends \MailSo\Base\Collection
{
	/**
	 * @var bool
	 */
	private $bUsed;

	/**
	 * @var array
	 */
	private $aForbiddenTypes;

	/**
	 * @var array
	 */
	private $aSecretWords;

	/**
	 * @var bool
	 */
	private $bShowSecter;

	/**
	 * @var bool
	 */
	private $bHideErrorNotices;

	/**
	 * @access protected
	 *
	 * @param bool $bRegPhpErrorHandler = false
	 */
	protected function __construct($bRegPhpErrorHandler = true)
	{
		parent::__construct();

		$this->bUsed = false;
		$this->aForbiddenTypes = array();
		$this->aSecretWords = array();
		$this->bShowSecter = false;
		$this->bHideErrorNotices = false;

		if ($bRegPhpErrorHandler)
		{
			\set_error_handler(array(&$this, '__phpErrorHandler'));
		}

		\register_shutdown_function(array(&$this, '__loggerShutDown'));
	}

	/**
	 * @param bool $bRegPhpErrorHandler = false
	 *
	 * @return \MailSo\Log\Logger
	 */
	public static function NewInstance($bRegPhpErrorHandler = false)
	{
		return new self($bRegPhpErrorHandler);
	}

	/**
	 * @staticvar \MailSo\Log\Logger $oInstance;
	 *
	 * @return \MailSo\Log\Logger
	 */
	public static function SingletonInstance()
	{
		static $oInstance = null;
		if (null === $oInstance)
		{
			$oInstance = self::NewInstance();
		}

		return $oInstance;
	}

	/**
	 * @param string $sFormat
	 * @param string $sTimeOffset = '0'
	 * @param int $iTimestamp = 0
	 *
	 * @return string
	 */
	public static function DateHelper($sFormat, $sTimeOffset = '0', $iTimestamp = null)
	{
		$iTimestamp = null === $iTimestamp ? \time() : (int) $iTimestamp;
		return \gmdate($sFormat, $iTimestamp + \MailSo\Base\DateTimeHelper::TimeToSec((string) $sTimeOffset));
	}

	/**
	 * @return bool
	 */
	public static function IsSystemEnabled()
	{
		return !!(\MailSo\Config::$SystemLogger instanceof \MailSo\Log\Logger);
	}

	/**
	 * @param mixed $mData
	 * @param int $iType = \MailSo\Log\Enumerations\Type::INFO
	 */
	public static function SystemLog($mData, $iType = \MailSo\Log\Enumerations\Type::INFO)
	{
		if (\MailSo\Config::$SystemLogger instanceof \MailSo\Log\Logger)
		{
			\MailSo\Config::$SystemLogger->WriteMixed($mData, $iType);
		}
	}

	/**
	 * @staticvar string $sCache;
	 *
	 * @return string
	 */
	public static function Guid()
	{
		static $sCache = null;
		if (null === $sCache)
		{
			$sCache = \substr(\MailSo\Base\Utils::Md5Rand(), -8);
		}

		return $sCache;
	}

	/**
	 * @return bool
	 */
	public function Ping()
	{
		return true;
	}

	/**
	 * @return bool
	 */
	public function IsEnabled()
	{
		return 0 < $this->Count();
	}

	/**
	 * @param string $sWord
	 *
	 * @return bool
	 */
	public function AddSecret($sWord)
	{
		if (\is_string($sWord) && 0 < \strlen(\trim($sWord)))
		{
			$this->aSecretWords[] = $sWord;
			$this->aSecretWords = \array_unique($this->aSecretWords);
		}
	}

	/**
	 * @param bool $bShow
	 *
	 * @return \MailSo\Log\Logger
	 */
	public function SetShowSecter($bShow)
	{
		$this->bShowSecter = !!$bShow;
		return $this;
	}

	/**
	 * @param bool $bValue
	 *
	 * @return \MailSo\Log\Logger
	 */
	public function HideErrorNotices($bValue)
	{
		$this->bHideErrorNotices = !!$bValue;
		return $this;
	}

	/**
	 * @return bool
	 */
	public function IsShowSecter()
	{
		return $this->bShowSecter;
	}

	/**
	 * @param int $iType
	 *
	 * @return \MailSo\Log\Logger
	 */
	public function AddForbiddenType($iType)
	{
		$this->aForbiddenTypes[$iType] = true;

		return $this;
	}

	/**
	 * @param int $iType
	 *
	 * @return \MailSo\Log\Logger
	 */
	public function RemoveForbiddenType($iType)
	{
		$this->aForbiddenTypes[$iType] = false;
		return $this;
	}

	/**
	 * @param int $iErrNo
	 * @param string $sErrStr
	 * @param string $sErrFile
	 * @param int $iErrLine
	 *
	 * @return bool
	 */
	public function __phpErrorHandler($iErrNo, $sErrStr, $sErrFile, $iErrLine)
	{
		$iType = \MailSo\Log\Enumerations\Type::NOTICE_PHP;
		switch ($iErrNo)
		{
			 case E_USER_ERROR:
				 $iType = \MailSo\Log\Enumerations\Type::ERROR_PHP;
				 break;
			 case E_USER_WARNING:
				 $iType = \MailSo\Log\Enumerations\Type::WARNING_PHP;
				 break;
		}

		$this->Write($sErrFile.' [line:'.$iErrLine.', code:'.$iErrNo.']', $iType, 'PHP');
		$this->Write('Error: '.$sErrStr, $iType, 'PHP');

		return !!(\MailSo\Log\Enumerations\Type::NOTICE === $iType && $this->bHideErrorNotices);
	}

	/**
	 * @return void
	 */
	public function __loggerShutDown()
	{
		if ($this->bUsed)
		{
			$aStatistic = \MailSo\Base\Loader::Statistic();
			if (\is_array($aStatistic))
			{
				if (isset($aStatistic['php']['memory_get_peak_usage']))
				{
					$this->Write('Memory peak usage: '.$aStatistic['php']['memory_get_peak_usage'],
						\MailSo\Log\Enumerations\Type::MEMORY);
				}

				if (isset($aStatistic['time']))
				{
					$this->Write('Time delta: '.$aStatistic['time'], \MailSo\Log\Enumerations\Type::TIME_DELTA);
				}
			}
		}
	}

	/**
	 * @return bool
	 */
	public function WriteEmptyLine()
	{
		$iResult = 1;

		$aLoggers =& $this->GetAsArray();
		foreach ($aLoggers as /* @var $oLogger \MailSo\Log\Driver */ &$oLogger)
		{
			$iResult &= $oLogger->WriteEmptyLine();
		}

		return (bool) $iResult;
	}

	/**
	 * @param string $sDesc
	 * @param int $iType = \MailSo\Log\Enumerations\Type::INFO
	 * @param string $sName = ''
	 * @param bool $bSearchSecretWords = true
	 * @param bool $bDiplayCrLf = false
	 *
	 * @return bool
	 */
	public function Write($sDesc, $iType = \MailSo\Log\Enumerations\Type::INFO,
		$sName = '', $bSearchSecretWords = true, $bDiplayCrLf = false)
	{
		if (isset($this->aForbiddenTypes[$iType]) && true === $this->aForbiddenTypes[$iType])
		{
			return true;
		}

		$this->bUsed = true;

		$oLogger = null;
		$aLoggers = array();
		$iResult = 1;

		if ($bSearchSecretWords && !$this->bShowSecter && 0 < \count($this->aSecretWords))
		{
			$sDesc = \str_replace($this->aSecretWords, '*******', $sDesc);
		}

		$aLoggers =& $this->GetAsArray();
		foreach ($aLoggers as /* @var $oLogger \MailSo\Log\Driver */ $oLogger)
		{
			$iResult &= $oLogger->Write($sDesc, $iType, $sName, $bDiplayCrLf);
		}

		return (bool) $iResult;
	}

	/**
	 * @param mixed $oValue
	 * @param int $iType = \MailSo\Log\Enumerations\Type::INFO
	 * @param string $sName = ''
	 * @param bool $bSearchSecretWords = false
	 * @param bool $bDiplayCrLf = false
	 *
	 * @return bool
	 */
	public function WriteDump($oValue, $iType = \MailSo\Log\Enumerations\Type::INFO, $sName = '',
		$bSearchSecretWords = false, $bDiplayCrLf = false)
	{
		return $this->Write(\print_r($oValue, true), $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
	}

	/**
	 * @param \Exception $oException
	 * @param int $iType = \MailSo\Log\Enumerations\Type::NOTICE
	 * @param string $sName = ''
	 * @param bool $bSearchSecretWords = true
	 * @param bool $bDiplayCrLf = false
	 *
	 * @return bool
	 */
	public function WriteException($oException, $iType = \MailSo\Log\Enumerations\Type::NOTICE, $sName = '',
		$bSearchSecretWords = true, $bDiplayCrLf = false)
	{
		if ($oException instanceof \Exception)
		{
			if (isset($oException->__LOGINNED__))
			{
				return true;
			}

			$oException->__LOGINNED__ = true;

			return $this->Write((string) $oException, $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
		}

		return false;
	}

	/**
	 * @param \Exception $oException
	 * @param int $iType = \MailSo\Log\Enumerations\Type::NOTICE
	 * @param string $sName = ''
	 * @param bool $bSearchSecretWords = true
	 * @param bool $bDiplayCrLf = false
	 *
	 * @return bool
	 */
	public function WriteExceptionShort($oException, $iType = \MailSo\Log\Enumerations\Type::NOTICE, $sName = '',
		$bSearchSecretWords = true, $bDiplayCrLf = false)
	{
		if ($oException instanceof \Exception)
		{
			if (isset($oException->__LOGINNED__))
			{
				return true;
			}

			$oException->__LOGINNED__ = true;

			return $this->Write($oException->getMessage(), $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
		}

		return false;
	}

	/**
	 * @param mixed $mData
	 * @param int $iType = \MailSo\Log\Enumerations\Type::NOTICE
	 * @param string $sName = ''
	 * @param bool $bSearchSecretWords = true
	 * @param bool $bDiplayCrLf = false
	 *
	 * @return bool
	 */
	public function WriteMixed($mData, $iType = null, $sName = '',
		$bSearchSecretWords = true, $bDiplayCrLf = false)
	{
		$iType = null === $iType ? \MailSo\Log\Enumerations\Type::INFO : $iType;
		if (\is_array($mData) || \is_object($mData))
		{
			if ($mData instanceof \Exception)
			{
				$iType = null === $iType ? \MailSo\Log\Enumerations\Type::NOTICE : $iType;
				return $this->WriteException($mData, $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
			}
			else
			{
				return  $this->WriteDump($mData, $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
			}
		}
		else
		{
			return $this->Write($mData, $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
		}

		return false;
	}
}
