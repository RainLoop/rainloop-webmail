<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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
	 * @var int
	 */
	public static $InitTime = 0;

	/**
	 * @var float
	 */
	public static $InitMicrotimeTime = 0;

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
	 */
	public static function Init() : void
	{
		static $bIsInited = false;
		if (!$bIsInited)
		{
			$bIsInited = true;

			self::$InitTime = \time();
			self::$InitMicrotimeTime = \microtime(true);

			self::SetStatistic('Inited', self::$InitMicrotimeTime);
		}
	}

	public static function IncStatistic(string $sName, int $iIncSize = 1) : void
	{
		if (self::$StoreStatistic)
		{
			self::$aIncStatistic[$sName] = isset(self::$aIncStatistic[$sName])
				? self::$aIncStatistic[$sName] + $iIncSize : $iIncSize;
		}
	}

	/**
	 * @param mixed $mValue
	 */
	public static function SetStatistic(string $sName, $mValue) : void
	{
		if (self::$StoreStatistic)
		{
			self::$aSetStatistic[$sName] = $mValue;
		}
	}

	/**
	 * @return mixed
	 */
	public static function GetStatistic(string $sName)
	{
		return self::$StoreStatistic && isset(self::$aSetStatistic[$sName]) ? self::$aSetStatistic[$sName] : null;
	}

	public static function Statistic() : ?array
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

			$iTimeDelta = \microtime(true) - self::GetStatistic('Inited');
			self::SetStatistic('TimeDelta', $iTimeDelta);

			$aResult['statistic'] = self::$aSetStatistic;
			$aResult['counts'] = self::$aIncStatistic;
			$aResult['time'] = $iTimeDelta;
		}

		return $aResult;
	}
}
