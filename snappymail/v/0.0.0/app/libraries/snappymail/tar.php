<?php

namespace SnappyMail;

class TAR
{
	public
		$alias,
		$filename;

	const dec = array(
		'mode', 'uid', 'gid', 'size', 'mtime', 'crc', 'type'
	);

	function __construct(string $filename, int $flags = 0, ?string $alias = null)
	{
		$this->filename = $filename;
		$this->alias = $alias ?: $filename;
	}

	/**
	 * @param $files array|string|null
	 */
	public function extractTo(string $directory, $files = null, bool $overwrite = false) : bool
	{
		$fp = \gzopen($this->filename, 'rb');
		if (!$fp) {
			return false;
		}

		if ($files) {
			$files = '/^(' . \implode('|', \array_map('preg_quote', \is_array($files) ? $files : [$files])) . ')/u';
		}

		\clearstatcache(false);
		\clearstatcache(true);
		while (!\gzeof($fp)) {
			$data = \gzread($fp, 512);
			if (\gzeof($fp) || !\trim($data)) {
				break;
			}
			if (\strlen($data) !== 512) {
				\trigger_error("{$this->alias} invalid header at offset " . \gztell($fp));
				return false;
			}
			$header = \unpack("a100filename/a8mode/a8uid/a8gid/a12size/a12mtime/a8crc/a1type/a100linkname/a6magic/a2version/a32uname/a32gname/a8devmajor/a8devminor/a155path", $data);
			if (!\strlen(\trim($header['filename']))) {
				\trigger_error("{$this->alias} invalid entry filename at offset " . \gztell($fp));
				return false;
			}
			foreach ($header as $k => $v) {
				$header[$k] = \in_array($k, self::dec) ? \octdec(\trim($v)) : \trim($v);
			}
			if ($header['crc'] > 0) {
				$crc = 0;
				for ($i = 0;   $i < 148; ++$i) { $crc += \ord(\substr($data, $i, 1)); }
				for ($i = 148; $i < 156; ++$i) { $crc += \ord(' '); }
				for ($i = 156; $i < 512; ++$i) { $crc += \ord(\substr($data, $i, 1)); }
				if ($header['crc'] !== $crc) {
					\trigger_error("{$this->alias} checksum of '{$header['filename']}' incorrect");
					return false;
				}
			}
			if (\preg_match('#(^|/)PaxHeader/#', $header['filename'])) {
			} else if (\substr($header['filename'], -1) !== '/') {
				$filename = ($header['path'] ? $header['path'] . '/' : '') . $header['filename'];
				if ($files && !\preg_match($files, $filename)) {
					continue;
				}
				$filename = $directory . '/' . $filename;
				if (\is_file($filename) && !$overwrite) {
					continue;
				}
				$dir = \dirname($filename);
				if (!\is_dir($dir) && !\mkdir($dir, 0777, true)) {
					return false;
				}
				$target = \fopen($filename, 'wb');
				if (!$target) {
					return false;
				}
				$bytes = $header['size'];
				$blocksize = \ceil($bytes / 512) * 512;
				$blocks = \ceil($blocksize / 8192);
				while ($blocks--) {
					$data = \gzread($fp, \min($blocksize, 8192));
					$length = \strlen($data);
					if ($bytes < $length) {
						$data = \substr($data, 0, $bytes);
					}
					\fwrite($target, $data);
					$bytes -= $length;
					$blocksize -= $length;
				}
				\fclose($target);
				\chmod($filename, $header['mode']);
			} else {
				// Create directory
//				\gzread($fp, $blocksize);
			}
		}
		\gzclose($fp);
		return true;
	}
}
