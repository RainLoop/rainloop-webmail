<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base\StreamWrappers;

/**
 * @category MailSo
 * @package Base
 * @subpackage StreamWrappers
 */
class TempFile
{
	/**
	 * @var string
	 */
	const STREAM_NAME = 'mailsotempfile';

	/**
	 * @var array
	 */
	private static $aStreams = array();

	/**
	 * @var resource
	 */
	private $rSream;

	public static function Reg()
	{
		if (!in_array(self::STREAM_NAME, stream_get_wrappers()))
		{
			stream_wrapper_register(self::STREAM_NAME, '\MailSo\Base\StreamWrappers\TempFile');
		}
	}

	/**
	 * @param string $sHash
	 * @param string $sFileName
	 *
	 * @return resource|bool
	 */
	public static function CreateStream($sHash, &$sFileName = '')
	{
		self::Reg();

		$sFileName = self::STREAM_NAME.'://'.$sHash;
		return fopen($sFileName, 'r+b');
	}

	/**
	 * @param string $sPath
	 *
	 * @return bool
	 */
	public function stream_open($sPath)
	{
		$bResult = false;
		$aPath = parse_url($sPath);

		if (isset($aPath['host']) && isset($aPath['scheme']) &&
			0 < strlen($aPath['host']) && 0 < strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				is_resource(self::$aStreams[$sHashName]))
			{
				$this->rSream = self::$aStreams[$sHashName];
				\fseek($this->rSream, 0);
				$bResult = true;
			}
			else
			{
				$this->rSream = fopen('php://memory', 'r+b');
				self::$aStreams[$sHashName] = $this->rSream;

				$bResult = true;

				\MailSo\Base\Loader::IncStatistic('CreateStream/TempFile');
			}
		}

		return $bResult;
	}

	/**
	 * @return bool
	 */
	public function stream_close()
	{
		return true;
	}

	/**
	 * @return bool
	 */
	public function stream_flush()
	{
		return fflush($this->rSream);
	}

	/**
	 * @param int $iLen
	 *
	 * @return string
	 */
	public function stream_read($iLen)
	{
		return fread($this->rSream, $iLen);
	}

	/**
	 * @param string $sInputString
	 *
	 * @return int
	 */
	public function stream_write($sInputString)
	{
		return fwrite($this->rSream, $sInputString);
	}

	/**
	 * @return int
	 */
	public function stream_tell()
	{
		return ftell($this->rSream);
	}

	/**
	 * @return bool
	 */
	public function stream_eof()
	{
		return feof($this->rSream);
	}

	/**
	 * @return array
	 */
	public function stream_stat()
	{
		return fstat($this->rSream);
	}

	/**
	 * @param int $iOffset
	 * @param int $iWhence = SEEK_SET
	 *
	 * @return int
	 */
	public function stream_seek($iOffset, $iWhence = SEEK_SET)
	{
		return fseek($this->rSream, $iOffset, $iWhence);
	}
}
