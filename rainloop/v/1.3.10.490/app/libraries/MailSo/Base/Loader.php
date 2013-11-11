<?php

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class Loader
{
	/**
	 * @var bool
	 */
	public static $StoreStatistic = true;

	/**
	 * @var array
	 */
	private static $aIncStatistic = array();

	/**
	 * @var array
	 */
	private static $aSetStatistic = array();

	/**
	 * @staticvar bool $bIsInited
	 *
	 * @return void
	 */
	public static function Init()
	{
		static $bIsInited = false;
		if (!$bIsInited)
		{
			$bIsInited = true;
			self::SetStatistic('Inited', \microtime(true));
		}
	}

	/**
	 * @param string $sName
	 * @param int $iIncSize = 1
	 *
	 * @return void
	 */
	public static function IncStatistic($sName, $iIncSize = 1)
	{
		if (self::$StoreStatistic)
		{
			self::$aIncStatistic[$sName] = isset(self::$aIncStatistic[$sName])
				? self::$aIncStatistic[$sName] + $iIncSize : $iIncSize;
		}
	}

	/**
	 * @param string $sName
	 * @param mixed $mValue
	 *
	 * @return void
	 */
	public static function SetStatistic($sName, $mValue)
	{
		if (self::$StoreStatistic)
		{
			self::$aSetStatistic[$sName] = $mValue;
		}
	}

	/**
	 * @param string $sName
	 *
	 * @return mixed
	 */
	public static function GetStatistic($sName)
	{
		return self::$StoreStatistic && isset(self::$aSetStatistic[$sName]) ? self::$aSetStatistic[$sName] : null;
	}

	/**
	 * @return array|null
	 */
	public static function Statistic()
	{
		$aResult = null;
		if (self::$StoreStatistic)
		{
			$aResult = array(
				'php' => array(
					'phpversion' => PHP_VERSION,
					'ssl' => (int) \function_exists('openssl_open'),
					'iconv' => (int) \function_exists('iconv')
			));

			if (\MailSo\Base\Utils::FunctionExistsAndEnabled('memory_get_usage') &&
				\MailSo\Base\Utils::FunctionExistsAndEnabled('memory_get_peak_usage'))
			{
				$aResult['php']['memory_get_usage'] =
					Utils::FormatFileSize(\memory_get_usage(true), 2);
				$aResult['php']['memory_get_peak_usage'] =
					Utils::FormatFileSize(\memory_get_peak_usage(true), 2);
			}

			self::SetStatistic('TimeDelta', \microtime(true) - self::GetStatistic('Inited'));

			$aResult['statistic'] = self::$aSetStatistic;
			$aResult['counts'] = self::$aIncStatistic;
		}

		return $aResult;
	}
}
