<?php

namespace SnappyMail\Stream;

class TAR
{
	const
		NONE    = "\x00\x00",
		DEFLATE = "\x08\x00",
		BZIP2   = "\x0C\x00",
		LZMA    = "\x0E\x00",

		TYPE_FILE = '0',
		TYPE_LINK = '2',
		TYPE_DIR  = '5';

	protected
		$gzip = false,
		$started = false,
		$out = null;

	function __construct($target = 'php://output', string $compression = self::DEFLATE)
	{
		if (\is_string($target)) {
			$target = \fopen($target, 'wb');
		}
		if (\is_resource($target)) {
			$this->out = $target;
		} else {
			throw new \Exception("Failed to open output: {$target}");
		}
		if (self::DEFLATE === $compression) {
			$this->gzip = array('w' => null, 'h' => null, 'l' => 0);
		}
	}

	function __destruct()
	{
		$this->close();
	}

	public function pushHttpHeaders(string $name) : void
	{
		if ($i = \ob_get_level()) {
			# Clear buffers:
			while ($i-- && \ob_end_clean());
			\ob_get_level() || \header('Content-Encoding: ');
		}
		\header('Cache-Control: no-store, no-cache, must-revalidate');
		\header('Pragma: no-cache');
		\header('Content-Transfer-Encoding: binary');
		if (false !== $this->gzip) {
			$name .= '.tgz';
			$name = \preg_match('#^[\x01-\x7F]*$#D', $name) ? $name : '=?UTF-8?B?'.\base64_encode($name).'?=';
			\header("Content-Disposition: attachment; filename={$name}");
			\header("Content-Type: application/gzip; name={$name}");
		} else {
			$name .= '.tar';
			$name = \preg_match('#^[\x01-\x7F]*$#D', $name) ? $name : '=?UTF-8?B?'.\base64_encode($name).'?=';
			\header("Content-Disposition: attachment; filename={$name}");
			\header("Content-Type: application/x-ustar; name={$name}");
		}
	}

	public function close() : void
	{
		if ($this->out) {
			if ($this->started) {
				// Write tar footer
				$this->write(pack('a1024', ''));
				// Stop compression
				if (!empty($this->gzip['w'])) {
					\stream_filter_remove($this->gzip['w']);
					// hash_final is a string, not an integer
					$crc = \hash_final($this->gzip['h'], 1);
					// write the little endian CRC32 and uncompressed file size
					\fwrite($this->out, $crc[3].$crc[2].$crc[1].$crc[0].\pack('V', $this->gzip['l']), 8);
				}
			}
			\fclose($this->out);
			$this->out = null;
		}
	}

	public function addFile($fileinfo, string $name = null) : bool
	{
		if (!($fileinfo instanceof \SplFileInfo)) {
			$fileinfo = new \SplFileInfo($fileinfo);
		}
		if (!$name) {
			$name = $fileinfo->getFilename();
		}
		if ($fileinfo->isLink()) {
			$stat = \lstat($fileinfo);
			$target = $fileinfo->getLinkTarget();
			if (\dirname($fileinfo->getPathname()) === \dirname($fileinfo->getRealPath())) {
				$target = \basename($target);
			}
			$this->writeEntryHeader(
				$name,
				static::TYPE_LINK,
				0,
				$stat['uid'],
				$stat['gid'],
				$stat['mode'],
				$stat['mtime'],
				$target
			);
		} else if ($fileinfo->isDir()) {
			$this->addDir($name, $fileinfo);
		} else if ($fileinfo->isFile()) {
			return $this->addFromStream($fileinfo->openFile('rb'), $name);
		}
		return true;
	}

	public function addFromStream($resource, string $name, int $time = 0) : bool
	{
		if (\is_resource($resource)) {
			$temp = new TarTempResource();
			while (!\feof($resource)) {
				$data = $resource->fread(4096);
				if (false === $data || '' === $data) {
					break;
				}
				$temp->write($data);
			}
			$temp->rewind();
			$resource = $temp;
		} else if (!$resource instanceof \SplFileObject) {
			throw new \Exception('Invalid resource');
		}

		$this->writeEntryHeader(
			\strtr($name, '\\', '/'),
			static::TYPE_FILE,
			$resource->getSize(),
			$resource->getOwner(),
			$resource->getGroup(),
			$resource->getPerms(),
			$time ?: $resource->getMTime()
		);
		$l = 0;
		while (!$resource->eof()) {
			// deflate works best with buffers >32K
			$data = $resource->fread(65536);
			if (false === $data || '' === $data) {
				break;
			}
			$l += $this->write($data);
		}
		if ($l = $l % 512) {
			$l = 512 - $l;
			$this->write(\pack("a{$l}", ''));
		}
		return true;
	}

	public function addFromString(string $name, string $data, int $time = 0) : bool
	{
		$this->writeEntryHeader(
			\strtr($name, '\\', '/'),
			static::TYPE_FILE,
			\strlen($data),
			0,
			0,
			420,
			$time
		);
		$l += $this->write($data);
		if ($l = $l % 512) {
			$l = 512 - $l;
			$this->write(\pack("a{$l}", ''));
		}
		return true;
	}

	public function addDir(string $dirname, \SplFileInfo $fileinfo = null) : void
	{
		$this->writeEntryHeader(
			\rtrim(\strtr($dirname, '\\', '/'), '/') . '/',
			static::TYPE_DIR,
			0,
			$fileinfo ? $fileinfo->getOwner() : 0,
			$fileinfo ? $fileinfo->getGroup() : 0,
			$fileinfo ? $fileinfo->getPerms() : 493,
			$fileinfo ? $fileinfo->getMTime() : 0
		);
	}

	public function addRecursive(string $dir, string $target_dir = '', $ignore = '#/(\\.hg(/|$)|\\.hgignore)#') : void
	{
		if (!$this->out) {
			throw new \Exception('Stream closed');
		}
		\clearstatcache();
		$dir = \rtrim($dir,'\\/') . '/';
		$dirl = \strlen($dir);
		if ($target_dir) {
			$target_dir = \rtrim($target_dir,'\\/') . '/';
		}
		$iterator = new \RecursiveIteratorIterator(
			new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS /*| \FilesystemIterator::FOLLOW_SYMLINKS*/),
			\RecursiveIteratorIterator::SELF_FIRST,
			\RecursiveIteratorIterator::CATCH_GET_CHILD);
		$ignore_paths = array();
		foreach ($iterator as $name => $fileinfo) {
			if ($ignore_paths && \preg_match('#'.\implode('|',$ignore_paths).'#', $name)) {
				continue;
			}
			if (!$ignore || !\preg_match($ignore, $name)) {
				$this->addFile($fileinfo, $target_dir . \substr($name, $dirl));
			}
			// like: tar --exclude-caches -czf file.tgz *
			if (\strpos($name, 'CACHEDIR.TAG')) {
				$ignore_paths[] = \preg_quote(\dirname($name) . '/','#');
			}
		}
	}

	protected function start()
	{
		if ($this->started) {
			return;
		}
		$this->started = true;
		if (false !== $this->gzip) {
			// Write gzip header, see http://www.zlib.org/rfc-gzip.html#member-format
			if (!\fwrite($this->out, "\x1F\x8B\x08\x00".\pack('V', \time())."\0\x03", 10)) {
				throw new \Exception('Failed to write to stream');
			}
			// Start ZLIB compression (RFC 1950)
			$this->gzip['w'] = \stream_filter_append($this->out, 'zlib.deflate', STREAM_FILTER_WRITE, array(
				'level' => 9,
//				'window' => 32768,
				'memory' => 9,
			));
			// Start CRC32 hashing
			$this->gzip['h'] = \hash_init('crc32b');
		}
	}

	protected function write($string)/* : int|bool*/
	{
		if (!$this->out) {
			throw new \Exception('Stream closed');
		}
		if (!$this->started) {
			$this->start();
		}
		$length = \strlen($string);
		$written = 0;
		while ($written < $length) {
			$bytes = \fwrite($this->out, $written ? \substr($string, $written) : $string);
			if (!$bytes) {
				return $written ?: false;
			}
			$written += $bytes;
		}

		if (!empty($this->gzip['h'])) {
			$this->gzip['l'] += $length;
			\hash_update($this->gzip['h'], $string);
		}

		return $written;
	}

	protected function writeEntryHeader($name, $type, $size, $uid = 0, $gid = 0, $perm = 0, $mtime = 0, $link = '', $prefix  = '')
	{
		// handle long filename length
		$paxdata = $paxname = '';
		if (100 < \strlen($link)) {
			$length = \strlen($link) + 11;
			$length += \strlen($length);
			$paxdata = "{$length} linkpath={$link}\n";
			$link = '././@LongSymLink';
		}
		$l = \strlen($name);
		if (($paxdata?90:100) < $l) {
			// split into name and prefix
			$p = \strpos($name, '/', \max(0, $l - 90));
			if ($p && $p < $l-1) {
				$file = \substr($name, $p+1);
				$prefix = \substr($name, 0, $p);
				$paxname = \preg_replace('#(^|/)([^/]+)$#', '$1PaxHeader/$2', $file);
			} else {
				$file = \basename($name);
				if (static::TYPE_DIR === $type) {
					$file .= '/';
				}
				$prefix = \dirname($name);
				$paxname = 'PaxHeader/' . $file;
			}
			if (100 < \strlen($file) || 155 < \strlen($prefix)) {
				// POSIX.1-2001/pax
				$length = $l + 7;
				$length += \strlen($length);
				$paxdata = "{$length} path={$name}\n{$paxdata}";
				if (static::TYPE_DIR === $type) {
					$name = \substr($file, 0, 98) . '/';
				} else {
					$name = \substr($file, 0, 99);
				}
			} else {
				// POSIX ustar
				$name = $file;
			}
			$paxname = \substr($paxname, 0, 98);
		}
		if ($paxdata) {
			/* Add?
			$data .= "30 mtime=1461056595.149922432\n"
			$data .= "30 ctime=1461056595.149922432\n"
			*/
			$this->writeUStarEntryHeader(
				$paxname ?: \preg_replace('#(^|/)([^/]+)$#', '$1PaxHeader/$2', $name),
				'x',
				\strlen($paxdata),
				$uid,
				$gid,
				$perm,
				$mtime,
				'',
				$prefix
			);
			$l = 512 * \ceil(\strlen($paxdata) / 512);
			$this->write(\pack("a{$l}", $paxdata));
		}

		$this->writeUStarEntryHeader($name, $type, $size, $uid, $gid, $perm, $mtime, $link, $prefix);
	}

	// Writes Pre-POSIX.1-1988 (i.e. v7) and POSIX UStar headers
	protected function writeUStarEntryHeader($name, $type, $size, $uid = 0, $gid = 0, $perm = 0, $mtime = 0, $link = '', $prefix  = '')
	{
		$data = \pack('a100a8a8a8a12A12',
			$name,
			// values in octal
			\sprintf("%06u ", \substr(\decoct($perm),-3)),
			\sprintf("%06u ", \decoct($uid)),
			\sprintf("%06u ", \decoct($gid)),
			\sprintf("%011u ", \decoct($size)),
			\sprintf("%011u", \decoct($mtime ?: \time())));
		$this->write($data);
		$checksum = 0;
		$i = 148;
		while ($i--) {
			$checksum += \ord($data[$i]);
		}

		$data = \pack('a1a100a6a2a32a32a8a8a155a12', $type, $link, 'ustar', '00', '', '', '000000 ', '000000 ', $prefix, '');
		$checksum += 256;
		$i = 356;
		while ($i--) {
			$checksum += \ord($data[$i]);
		}

		$this->write(\pack('a8', \sprintf('%06u ', \decoct($checksum))) . $data);
	}

}

class TarTempResource extends \SplTempFileObject
{
	#[\ReturnTypeWillChange]
	public function getOwner()/*: int|false*/ { return 0; }
	#[\ReturnTypeWillChange]
	public function getGroup()/*: int|false*/ { return 0; }
	#[\ReturnTypeWillChange]
	public function getPerms()/*: int|false*/ { return 420; }
}
