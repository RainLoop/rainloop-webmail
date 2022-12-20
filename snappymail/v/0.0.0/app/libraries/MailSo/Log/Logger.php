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
	private bool $bUsed = false;

	private int $iLevel = \LOG_WARNING;

	private array $aSecretWords = [];

	private bool $bShowSecrets = false;

	function __construct(bool $bMainLogger = false)
	{
		parent::__construct();

		if ($bMainLogger) {
			\set_error_handler(array($this, '__phpErrorHandler'));
			\set_exception_handler(array($this, '__phpExceptionHandler'));
			\register_shutdown_function(array($this, '__loggerShutDown'));
		}
	}

	/**
	 * @staticvar string $sCache;
	 */
	public static function Guid() : string
	{
		static $sCache = null;
		if (null === $sCache) {
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
//		$this->bShowSecrets && $this->Write("AddSecret '{$sWord}'", \LOG_INFO, '', false);
		$sWord = \trim($sWord);
		if (\strlen($sWord)) {
			$this->aSecretWords[] = $sWord;
			$this->aSecretWords = \array_unique($this->aSecretWords);
		}
	}

	public function SetShowSecrets(bool $bShow) : self
	{
		$this->bShowSecrets = $bShow;
		return $this;
	}

	public function ShowSecrets() : bool
	{
		return $this->bShowSecrets;
	}

	public function SetLevel(int $iLevel) : self
	{
		$this->iLevel = $iLevel;
		return $this;
	}

	const PHP_TYPES = array(
		\E_ERROR => \LOG_ERR,
		\E_WARNING => \LOG_WARNING,
		\E_PARSE => \LOG_CRIT,
		\E_NOTICE => \LOG_NOTICE,
		\E_CORE_ERROR => \LOG_ERR,
		\E_CORE_WARNING => \LOG_WARNING,
		\E_COMPILE_ERROR => \LOG_ERR,
		\E_COMPILE_WARNING => \LOG_WARNING,
		\E_USER_ERROR => \LOG_ERR,
		\E_USER_WARNING => \LOG_WARNING,
		\E_USER_NOTICE => \LOG_NOTICE,
		\E_STRICT => \LOG_CRIT,
		\E_RECOVERABLE_ERROR => \LOG_ERR,
		\E_DEPRECATED => \LOG_INFO,
		\E_USER_DEPRECATED => \LOG_INFO
	);

	const PHP_TYPE_POSTFIX = array(
		\E_ERROR => '',
		\E_WARNING => '',
		\E_PARSE => '-PARSE',
		\E_NOTICE => '',
		\E_CORE_ERROR => '-CORE',
		\E_CORE_WARNING => '-CORE',
		\E_COMPILE_ERROR => '-COMPILE',
		\E_COMPILE_WARNING => '-COMPILE',
		\E_USER_ERROR => '-USER',
		\E_USER_WARNING => '-USER',
		\E_USER_NOTICE => '-USER',
		\E_STRICT => '-STRICT',
		\E_RECOVERABLE_ERROR => '-RECOVERABLE',
		\E_DEPRECATED => '-DEPRECATED',
		\E_USER_DEPRECATED => '-USER_DEPRECATED'
	);

	public function __phpErrorHandler(int $iErrNo, string $sErrStr, string $sErrFile, int $iErrLine) : bool
	{
		if (\error_reporting() & $iErrNo) {
			$this->Write(
				"{$sErrStr} {$sErrFile} [line:{$iErrLine}, code:{$iErrNo}]",
				static::PHP_TYPES[$iErrNo],
				'PHP' . static::PHP_TYPE_POSTFIX[$iErrNo]
			);
		}
		/* forward to standard PHP error handler */
		return false;
	}

	/**
	 * Called by PHP when an Exception is uncaught
	 */
	public function __phpExceptionHandler(\Throwable $oException): void
	{
		$this->Write('Uncaught exception: ' . $oException, \LOG_CRIT);
		\error_log('Uncaught exception: ' . $oException);
	}

	public function __loggerShutDown() : void
	{
		if ($this->bUsed) {
			$this->Write('Memory peak usage: '.\MailSo\Base\Utils::FormatFileSize(\memory_get_peak_usage(true), 2));
			$this->Write('Time delta: '.(\microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']));
		}
	}

	public function Write(string $sDesc, int $iType = \LOG_INFO,
		string $sName = '', bool $bSearchSecretWords = true, bool $bDiplayCrLf = false) : bool
	{
		if ($this->iLevel < $iType) {
			return true;
		}

		$this->bUsed = true;

		if ($bSearchSecretWords && !$this->bShowSecrets && $this->aSecretWords)
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
	 * @param mixed $mValue
	 */
	public function WriteDump($mValue, int $iType = \LOG_INFO, string $sName = '') : bool
	{
		return $this->Write(\print_r($mValue, true), $iType, $sName);
	}

	private $aExceptions = [];

	public function WriteException(\Throwable $oException, int $iType = \LOG_NOTICE, string $sName = '') : void
	{
		if (!\in_array($oException, $this->aExceptions)) {
			$this->Write((string) $oException, $iType, $sName);
			$this->aExceptions[] = $oException;
		}
	}

	public function WriteExceptionShort(\Throwable $oException, int $iType = \LOG_NOTICE, string $sName = '') : void
	{
		if (!\in_array($oException, $this->aExceptions)) {
			$this->Write($oException->getMessage(), $iType, $sName);
			$this->aExceptions[] = $oException;
		}
	}
}
