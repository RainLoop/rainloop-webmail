<?php

namespace SnappyMail\File;

class Temporary
{
	protected string $filename = '';

	function __construct(string $name, bool $prefix = true)
	{
		$tmpdir = \sys_get_temp_dir() . '/snappymail';
//		if (\RainLoop\Utils::inOpenBasedir($tmpdir) &&
		\is_dir($tmpdir) || \mkdir($tmpdir, 0700);
		if (!\is_dir($tmpdir)) {
			throw new \Exception("Failed to create directory {$tmpdir}");
		}
		if (!\is_writable($tmpdir)) {
//			throw new \Exception("Failed to access directory {$tmpdir}");
		}
		if ($prefix) {
			$this->filename = @\tempnam($tmpdir, $name);
		} else {
			$this->filename = $tmpdir . '/' . $name;
		}
	}

	function __destruct()
	{
		$this->filename && \unlink($this->filename);
	}

	function __toString() : string
	{
		return $this->filename;
	}

	public function filename() : string
	{
		return $this->filename;
	}

	private $fp = null;
	public function fopen()/* : resource|false*/
	{
		if (!$this->fp) {
			$this->fp = \fopen($this->filename, 'r+b');
		}
		return $this->fp;
	}

	public function writeFromStream(/*resource*/ $from)/* : int|false*/
	{
		$fp = $this->fopen();
//		return \stream_copy_to_stream($from, $fp); // Fails
		$bytes = 0;
		while (!\feof($from)) $bytes += \fwrite($fp, \fread($from, 8192));
		return $bytes;
	}

	public function putContents($data, int $flags = 0)/* : int|false*/
	{
		return \file_put_contents($this->filename, $data /*, $flags, $context*/);
	}

	public function getContents()/* : string|false*/
	{
		return \file_get_contents($this->filename);
	}
}
