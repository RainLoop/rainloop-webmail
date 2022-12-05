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
	/** @var resource|null */
	public $context;

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
	 * @param resource $rStream
	 *
	 * @return resource|bool
	 */
	public static function CreateStream($rStream, int $iLiteralLen)
	{
		$sHashName = \md5(\microtime(true).\rand(1000, 9999));

		self::$aStreams[$sHashName] = array($rStream, $iLiteralLen);

		return \fopen(self::STREAM_NAME.'://'.$sHashName, 'rb');
	}

	public function stream_cast(int $cast_as) /*: resource*/
	{
		return false; // $this->rStream;
	}

	public function stream_open(string $sPath) : bool
	{
		$this->iPos = 0;
		$this->iSize = 0;
		$this->rStream = false;

		$aPath = \parse_url($sPath);

		if (isset($aPath['host']) && isset($aPath['scheme']) &&
			\strlen($aPath['host']) && \strlen($aPath['scheme']) &&
			self::STREAM_NAME === $aPath['scheme'])
		{
			$sHashName = $aPath['host'];
			if (isset(self::$aStreams[$sHashName]) &&
				\is_array(self::$aStreams[$sHashName]) &&
				2 === \count(self::$aStreams[$sHashName]))
			{
				$this->rStream = self::$aStreams[$sHashName][0];
				$this->iSize = self::$aStreams[$sHashName][1];
			}

			return \is_resource($this->rStream);
		}

		return false;
	}

	public function stream_read(int $iCount) : string
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
				$sAddRead = \fread($this->rStream, $iRead);
				if (false === $sAddRead)
				{
					$sReadResult = false;
					break;
				}

				$sReadResult .= $sAddRead;
				$iRead -= \strlen($sAddRead);
				$this->iPos += \strlen($sAddRead);
			}

			if (false !== $sReadResult)
			{
				$sResult = $sReadResult;
			}
		}

		return $sResult;
	}

	public function stream_write() : int
	{
		return 0;
	}

	public function stream_tell() : int
	{
		return $this->iPos;
	}

	public function stream_eof() : bool
	{
		return $this->iPos >= $this->iSize;
	}

	public function stream_stat() : array
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

	public function stream_seek() : bool
	{
		return false;
	}
}

\stream_wrapper_register(Literal::STREAM_NAME, Literal::class);
