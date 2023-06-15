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
class Literal
{
	/**
	 * @var string
	 */
	const STREAM_NAME = 'mailsoliteral';

	/**
	 * @var array
	 */
	private static $aStreams = array();

	/**
	 * @var resource
	 */
	private $rStream;

	/**
	 * @var int
	 */
	private $iSize;

	/**
	 * @var int
	 */
	private $iPos;
	
	/**
	 * @var string
	 */
	public $context;
	
	/**
	 * @param resource $rStream
	 * @param int $iLiteralLen
	 *
	 * @return resource|bool
	 */
	public static function CreateStream($rStream, $iLiteralLen)
	{
		if (!in_array(self::STREAM_NAME, stream_get_wrappers()))
		{
			stream_wrapper_register(self::STREAM_NAME, '\MailSo\Base\StreamWrappers\Literal');
		}

		$sHashName = md5(microtime(true).rand(1000, 9999));

		self::$aStreams[$sHashName] = array($rStream, $iLiteralLen);

		\MailSo\Base\Loader::IncStatistic('CreateStream/Literal');

		return fopen(self::STREAM_NAME.'://'.$sHashName, 'rb');
	}

	/**
	 * @param string $sPath
	 *
	 * @return bool
	 */
	public function stream_open($sPath)
	{
		$this->iPos = 0;
		$this->iSize = 0;
		$this->rStream = false;

		$bResult = false;
		$aPath = parse_url($sPath);

		if (isset($aPath['host']) && isset($aPath['scheme']) &&
			0 < strlen($aPath['host']) && 0 < strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				is_array(self::$aStreams[$sHashName]) &&
				2 === count(self::$aStreams[$sHashName]))
			{
				$this->rStream = self::$aStreams[$sHashName][0];
				$this->iSize = self::$aStreams[$sHashName][1];
			}

			$bResult = is_resource($this->rStream);
		}

		return $bResult;
	}

	/**
	 * @param int $iCount
	 *
	 * @return string
	 */
	public function stream_read($iCount)
	{
		$sResult = false;
		if ($this->iSize < $this->iPos + $iCount)
		{
			$iCount = $this->iSize - $this->iPos;
		}

		if ($iCount > 0)
		{
			$sReadResult = '';
			$iRead = $iCount;
			while (0 < $iRead)
			{
				$sAddRead = @fread($this->rStream, $iRead);
				if (false === $sAddRead)
				{
					$sReadResult = false;
					break;
				}

				$sReadResult .= $sAddRead;
				$iRead -= strlen($sAddRead);
				$this->iPos += strlen($sAddRead);
			}

			if (false !== $sReadResult)
			{
				$sResult = $sReadResult;
			}
		}

		return $sResult;
	}

	/**
	 * @return int
	 */
	public function stream_write()
	{
		return 0;
	}

	/**
	 * @return int
	 */
	public function stream_tell()
	{
		return $this->iPos;
	}

	/**
	 * @return bool
	 */
	public function stream_eof()
	{
		return $this->iPos >= $this->iSize;
	}

	/**
	 * @return array
	 */
	public function stream_stat()
	{
		return array(
			'dev' => 2,
			'ino' => 0,
			'mode' => 33206,
			'nlink' => 1,
			'uid' => 0,
			'gid' => 0,
			'rdev' => 2,
			'size' => $this->iSize,
			'atime' => 1061067181,
			'mtime' => 1056136526,
			'ctime' => 1056136526,
			'blksize' => -1,
			'blocks' => -1
		);
	}

	/**
	 * @return bool
	 */
	public function stream_seek()
	{
		return false;
	}
}
