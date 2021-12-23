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
class Logger extends \SplFixedArray
{
	private $bUsed = false;

	private $aForbiddenTypes = [];

	private $aSecretWords = [];

	private $bShowSecrets = false;

	function __construct(bool $bRegPhpErrorHandler = true)
	{
		parent::__construct();

		if ($bRegPhpErrorHandler)
		{
			\set_error_handler(array($this, '__phpErrorHandler'));
		}

		\register_shutdown_function(array($this, '__loggerShutDown'));
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
	public static function SystemLog($mData, int $iType = Enumerations\Type::INFO)
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
			$sCache = \substr(\MailSo\Base\Utils::Sha1Rand(), -8);
		}

		return $sCache;
	}

	public function append($oDriver) : void
	{
		if ($oDriver) {
			$this->setSize(1);
			$this[0] = $oDriver;
		}
	}

	public function IsEnabled() : bool
	{
		return 0 < $this->count();
	}

	public function AddSecret(string $sWord) : void
	{
		if (\strlen(\trim($sWord)))
		{
			$this->aSecretWords[] = $sWord;
			$this->aSecretWords = \array_unique($this->aSecretWords);
		}
	}

	public function SetShowSecrets(bool $bShow) : self
	{
		$this->bShowSecrets = $bShow;
		return $this;
	}

	public function IsShowSecter() : bool
	{
		return $this->bShowSecrets;
	}

	public function AddForbiddenType(int $iType) : self
	{
		$this->aForbiddenTypes[$iType] = true;

		return $this;
	}

	public function __phpErrorHandler(int $iErrNo, string $sErrStr, string $sErrFile, int $iErrLine) : bool
	{
		if (\error_reporting() & $iErrNo) {
			$iType = Enumerations\Type::NOTICE_PHP;
			switch ($iErrNo)
			{
				 case E_USER_ERROR:
					 $iType = Enumerations\Type::ERROR_PHP;
					 break;
				 case E_USER_WARNING:
					 $iType = Enumerations\Type::WARNING_PHP;
					 break;
			}
/*
				case E_ERROR:
				case E_WARNING:
				case E_PARSE:
				case E_NOTICE:
				case E_CORE_ERROR:
				case E_CORE_WARNING:
				case E_COMPILE_ERROR:
				case E_COMPILE_WARNING:
				case E_USER_NOTICE:
				case E_STRICT:
				case E_RECOVERABLE_ERROR:
				case E_DEPRECATED:
				case E_USER_DEPRECATED:
*/
			$this->Write($sErrFile.' [line:'.$iErrLine.', code:'.$iErrNo.']', $iType, 'PHP');
			$this->Write('Error: '.$sErrStr, $iType, 'PHP');
		}
		/* forward to standard PHP error handler */
		return false;
	}

	public function __loggerShutDown() : void
	{
		if ($this->bUsed)
		{
			$this->Write('Memory peak usage: '.\MailSo\Base\Utils::FormatFileSize(\memory_get_peak_usage(true), 2),
				Enumerations\Type::MEMORY);
			$this->Write('Time delta: '.(\microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']), Enumerations\Type::TIME_DELTA);
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

	public function Write(string $sDesc, int $iType = Enumerations\Type::INFO,
		string $sName = '', bool $bSearchSecretWords = true, bool $bDiplayCrLf = false) : bool
	{
		if (!empty($this->aForbiddenTypes[$iType]))
		{
			return true;
		}

		$this->bUsed = true;

		if ($bSearchSecretWords && !$this->bShowSecrets && \count($this->aSecretWords))
		{
			$sDesc = \str_replace($this->aSecretWords, '*******', $sDesc);
		}

		$iResult = 1;

		foreach ($this as /* @var $oLogger \MailSo\Log\Driver */ $oLogger)
		{
			$iResult = $oLogger->Write($sDesc, $iType, $sName, $bDiplayCrLf);
		}

		return (bool) $iResult;
	}

	/**
	 * @param mixed $oValue
	 */
	public function WriteDump($oValue, int $iType = Enumerations\Type::INFO, string $sName = '',
		bool $bSearchSecretWords = false, bool $bDiplayCrLf = false) : bool
	{
		return $this->Write(\print_r($oValue, true), $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
	}

	public function WriteException(\Throwable $oException, int $iType = Enumerations\Type::NOTICE, string $sName = '',
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

	public function WriteExceptionShort(\Throwable $oException, int $iType = Enumerations\Type::NOTICE, string $sName = '',
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
		$iType = null === $iType ? Enumerations\Type::INFO : $iType;
		if (\is_array($mData) || \is_object($mData))
		{
			if ($mData instanceof \Throwable)
			{
				$iType = null === $iType ? Enumerations\Type::NOTICE : $iType;
				return $this->WriteException($mData, $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
			}
			return  $this->WriteDump($mData, $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
		}
		return $this->Write($mData, $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
	}
}
