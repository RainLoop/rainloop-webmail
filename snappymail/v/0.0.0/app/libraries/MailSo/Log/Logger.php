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

	function __construct(bool $bRegPhpErrorHandler = true)
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
	 * @staticvar \MailSo\Log\Logger $oInstance;
	 */
	public static function SingletonInstance() : self
	{
		static $oInstance = null;
		if (null === $oInstance)
		{
			$oInstance = new self;
		}

		return $oInstance;
	}

	public static function IsSystemEnabled() : bool
	{
		return !!(\MailSo\Config::$SystemLogger instanceof Logger);
	}

	/**
	 * @param mixed $mData
	 */
	public static function SystemLog($mData, int $iType = \MailSo\Log\Enumerations\Type::INFO)
	{
		if (\MailSo\Config::$SystemLogger instanceof Logger)
		{
			\MailSo\Config::$SystemLogger->WriteMixed($mData, $iType);
		}
	}

	/**
	 * @staticvar string $sCache;
	 */
	public static function Guid() : string
	{
		static $sCache = null;
		if (null === $sCache)
		{
			$sCache = \substr(\MailSo\Base\Utils::Md5Rand(), -8);
		}

		return $sCache;
	}

	public function Ping() : bool
	{
		return true;
	}

	public function IsEnabled() : bool
	{
		return 0 < $this->Count();
	}

	public function AddSecret(string $sWord) : void
	{
		if (0 < \strlen(\trim($sWord)))
		{
			$this->aSecretWords[] = $sWord;
			$this->aSecretWords = \array_unique($this->aSecretWords);
		}
	}

	public function SetShowSecter(bool $bShow) : self
	{
		$this->bShowSecter = !!$bShow;
		return $this;
	}

	public function HideErrorNotices(bool $bValue) : self
	{
		$this->bHideErrorNotices = !!$bValue;
		return $this;
	}

	public function IsShowSecter() : bool
	{
		return $this->bShowSecter;
	}

	public function AddForbiddenType(int $iType) : self
	{
		$this->aForbiddenTypes[$iType] = true;

		return $this;
	}

	public function RemoveForbiddenType(int $iType) : self
	{
		$this->aForbiddenTypes[$iType] = false;
		return $this;
	}

	public function __phpErrorHandler(int $iErrNo, string $sErrStr, string $sErrFile, int $iErrLine) : bool
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

	public function __loggerShutDown() : void
	{
		if ($this->bUsed && $aStatistic = \MailSo\Base\Loader::Statistic())
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

	public function WriteEmptyLine() : bool
	{
		$iResult = 1;

		foreach ($this as /* @var $oLogger \MailSo\Log\Driver */ $oLogger)
		{
			$iResult = $oLogger->WriteEmptyLine();
		}

		return (bool) $iResult;
	}

	public function Write(string $sDesc, int $iType = \MailSo\Log\Enumerations\Type::INFO,
		string $sName = '', bool $bSearchSecretWords = true, bool $bDiplayCrLf = false) : bool
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

		foreach ($this as /* @var $oLogger \MailSo\Log\Driver */ $oLogger)
		{
			$iResult = $oLogger->Write($sDesc, $iType, $sName, $bDiplayCrLf);
		}

		return (bool) $iResult;
	}

	/**
	 * @param mixed $oValue
	 */
	public function WriteDump($oValue, int $iType = \MailSo\Log\Enumerations\Type::INFO, string $sName = '',
		bool $bSearchSecretWords = false, bool $bDiplayCrLf = false) : bool
	{
		return $this->Write(\print_r($oValue, true), $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
	}

	public function WriteException(\Throwable $oException, int $iType = \MailSo\Log\Enumerations\Type::NOTICE, string $sName = '',
		bool $bSearchSecretWords = true, bool $bDiplayCrLf = false) : bool
	{
		if ($oException instanceof \Throwable)
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

	public function WriteExceptionShort(\Throwable $oException, int $iType = \MailSo\Log\Enumerations\Type::NOTICE, string $sName = '',
		bool $bSearchSecretWords = true, bool $bDiplayCrLf = false) : bool
	{
		if ($oException instanceof \Throwable)
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
	 */
	public function WriteMixed($mData, int $iType = null, string $sName = '',
		bool $bSearchSecretWords = true, bool $bDiplayCrLf = false) : bool
	{
		$iType = null === $iType ? \MailSo\Log\Enumerations\Type::INFO : $iType;
		if (\is_array($mData) || \is_object($mData))
		{
			if ($mData instanceof \Throwable)
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
