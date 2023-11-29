<?php
/*
	Zip file creation class.
	Official ZIP format: https://support.pkware.com/display/PKZIP/APPNOTE
*/

namespace SnappyMail\Stream;

class ZIP
{
	const
		NONE    = "\x00\x00",
		DEFLATE = "\x08\x00",
		BZIP2   = "\x0C\x00",
		LZMA    = "\x0E\x00";

	private
		$encryption,  // TODO
		$compression,

		/**
		 * Central directory
		 */
		$ctrl_dir = array(),

		/**
		 * Last offset position
		 */
		$offset   = 0,

		/**
		 * Target resource
		 */
		$out      = null;

	function __construct($target = 'php://output', string $compression = self::DEFLATE)
	{
		if (\is_string($target)) {
			$target = \fopen($target, 'wb');
		}
		if (\is_resource($target)) {
			$this->out = $target;
		}
		if (!$this->out) {
			throw new \Exception("Failed to open output: {$target}");
		}

		switch ($compression)
		{
		case self::LZMA:
			if (\function_exists('lzf_compress')) {
				break;
			}
		case self::BZIP2:
			if (\function_exists('bzcompress')) {
				$compression = self::BZIP2;
				break;
			}
		case self::DEFLATE:
			$compression = self::DEFLATE;
			break;
		case self::NONE:
			break;
		}
		$this->compression = $compression;
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
		\header('Cache-Control: no-store');
		\header('Pragma: no-cache');
		\header('Content-Transfer-Encoding: binary');
		$name = "{$name}.zip";
		$name = \preg_match('#^[\x01-\x7F]*$#D', $name) ? $name : '=?UTF-8?B?'.\base64_encode($name).'?=';
		\header("Content-Disposition: attachment; filename={$name}");
		\header("Content-Type: application/zip; name={$name}");
	}

	public function close() : void
	{
		if ($this->out) {
			// End of central directory record
			$ctrldir = \implode('', $this->ctrl_dir);
			$count   = \pack('v', \count($this->ctrl_dir));
			\fwrite($this->out, $ctrldir
				. "\x50\x4b\x05\x06\x00\x00\x00\x00"
				. $count                      // total # of entries "on this disk"
				. $count                      // total # of entries overall
				. \pack('V', \strlen($ctrldir)) // size of central dir
				. \pack('V', $this->offset)    // offset to start of central dir
				. "\x00\x00");                // .zip file comment length
			\fclose($this->out);
			$this->out = null;
		}
	}

	public function addFile($file, string $name = null) : bool
	{
		if (\is_file($file) && $fp = new \SplFileObject($file, 'rb')) {
			return $this->addFromStream($fp, $name ?: \basename($file));
		}
		return false;
	}

	public function addFromStream($resource, string $name, int $time = 0) : bool
	{
		if ($resource instanceof \SplFileObject) {
			if (!$time) {
				$time = $resource->getMTime();
			}
		} else if (\is_resource($resource)) {
			$resource = new ZipResource($resource);
		} else {
			throw new \Exception('Invalid resource');
		}

		$file = new ZipEntry(
			$name,
			$time,
			(self::NONE === $this->compression) ? self::NONE : self::DEFLATE
		);

		$bytes = \fwrite($this->out, $file->getHeader());

		if (self::NONE === $this->compression) {
			while (!$resource->eof()) {
				$data = $resource->fread(16384);
				if (false === $data || '' === $data) {
					break;
				}
				$file->updateCrc32($data);
				$file->u_len += \strlen($data);
				$file->c_len += \fwrite($this->out, $data);
			}
		} else {
			$zip = \deflate_init(ZLIB_ENCODING_RAW, array('level' => 9));
			while (!$resource->eof()) {
				// deflate works best with buffers >32K
				$data = $resource->fread(65536);
				if (false === $data || '' === $data) {
					break;
				}
				$file->updateCrc32($data);
				$file->u_len += \strlen($data);
				$file->c_len += \fwrite($this->out, \deflate_add($zip, $data, ZLIB_NO_FLUSH));
			}
			$file->c_len += \fwrite($this->out, \deflate_add($zip, '', ZLIB_FINISH));
		}

		// Write the Data descriptor
		$bytes += \fwrite($this->out, $file->getDataDescriptor());

		// now add to central directory record
		$this->ctrl_dir[] = $file->getDirEntry($this->offset);

		$this->offset += $bytes + $file->c_len;

		return true;
	}

	public function addFromString(string $name, string $data, int $time = 0) : bool
	{
		$file = new ZipEntry($name, $time, $this->compression);
		$file->u_len = \strlen($data);
		$file->setCrc32(\crc32($data));

		switch ($this->compression)
		{
		case self::NONE:
			break;
		case self::DEFLATE:
			$data = \gzdeflate($data, 9);
			break;
		case self::BZIP2:
			$data = \bzcompress($data, 9);
			break;
		case self::LZMA:
			$data = \lzf_compress($data);
			break;
		}
		$file->c_len = \strlen($data);

		$bytes = \fwrite($this->out, $file->getHeader() . $data);

		// now add to central directory record
		$this->ctrl_dir[] = $file->getDirEntry($this->offset);

		$this->offset += $bytes;

		return true;
	}

	public function addRecursive(string $dir, string $target_dir = '', string $ignore = '#/(\\.hg(/|$)|\\.hgignore)#') : void
	{
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
				$this->addFile($name, $target_dir . \substr($name, $dirl));
			}
			// like: tar --exclude-caches -czf file.tgz *
			if (\strpos($name, 'CACHEDIR.TAG')) {
				$ignore_paths[] = \preg_quote(\dirname($name) . '/','#');
			}
		}
	}

/*
	protected function encrypt($data)
	{
		 5.1 - File is encrypted using AES encryption
		 6.1 - File is encrypted using non-OAEP key wrapping***
		 6.3 - File is encrypted using Blowfish
		 6.3 - File is encrypted using Twofish
	}
*/
}

class ZipResource /* SplFileObject */
{
	protected $source;
	function __construct($source) { $this->source = $source; }
	public function eof() : bool { return \feof($this->source); }
	public function fread($length) { return \fread($this->source, $length); }
}

class ZipEntry
{
	const
		NO_CRC32 = "\x00\x00\x00\x00",

		FLAG_ENCRYPTED         = 1,
		// Method 6 - Imploding compression method used
		FLAG_IMPLODE_4K        = 0,    // 4K sliding dictionary was used
		FLAG_IMPLODE_8K        = 2,    // 8K sliding dictionary was used
		FLAG_IMPLODE_2SF       = 0,    // 2 Shannon-Fano trees were used
		FLAG_IMPLODE_3SF       = 4,    // 3 Shannon-Fano trees were used
		// For Methods 8 and 9 - Deflating
		FLAG_DEFLATE_NORMAL    = 0,
		FLAG_DEFLATE_MAXIMUM   = 2,
		FLAG_DEFLATE_FAST      = 4,
		FLAG_DEFLATE_SUPERFAST = 6,
		// For Method 14 - LZMA
		FLAG_LZMA_EOS          = 2,    // end-of-stream marker is used
		/* If FLAG_DATA_DESCRIPTOR is set, the fields crc-32, compressed size
		 * and uncompressed size are set to zero in the local header.
		 * The correct values are put in the data descriptor immediately
		 * following the compressed data
		 */
		FLAG_DATA_DESCRIPTOR   = 8,
		FLAG_PATCHED           = 32,   // the file is compressed patched data
		FLAG_STRONG_ENCRYPTION = 65,   // 64 + 1
		FLAG_EFS_UTF8          = 2048, // Language encoding flag, filename and comment fields for this file MUST be encoded using UTF-8
		FLAG_ENCRYPTED_CD      = 8192; // encrypting the Central Directory

	public
		/**
		 * uncompressed filesize
		 */
		$u_len = 0,

		/**
		 * compressed filesize
		 */
		$c_len = 0;

	protected
		$hctx,
		$name,
		$time,
		$flags = 0,
		$compression,
		$crc32 = self::NO_CRC32;

	function __construct(string $name, int $time, string $compression)
	{
		$this->name = \strtr($name, '\\', '/');

		// Convert Unix time to DOS
		$time = \getdate($time ?: \time());
		if ($time['year'] < 1980) {
			$this->time = "\x00\x00\x21\x00";
		} else {
			$time = (($time['year'] - 1980) << 25) | ($time['mon'] << 21) | ($time['mday'] << 16) |
				($time['hours'] << 11) | ($time['minutes'] << 5) | ($time['seconds'] >> 1);
			$time = \str_pad(\dechex($time), 8, '0', STR_PAD_LEFT);
			$this->time = \hex2bin($time[6] . $time[7] . $time[4] . $time[5] . $time[2] . $time[3] . $time[0] . $time[1]);
		}

		$this->compression = $compression;

		$this->flags = self::FLAG_EFS_UTF8;
		if (Zip::DEFLATE === $compression) {
			$this->flags |= self::FLAG_DEFLATE_MAXIMUM;
		}
	}

	protected function getEntry() : string
	{
		$versions = array(
			Zip::NONE    => "\x0A\x00", // v1
			Zip::DEFLATE => "\x14\x00", // v2
			Zip::BZIP2   => "\x2E\x00", // v4.6
			Zip::LZMA    => "\x3F\x00", // v6.3
		);
		return $versions[$this->compression]     // ver needed to extract
			. \pack('v', $this->flags)            // gen purpose bit flag
			. $this->compression                 // compression method
			. $this->time                        // last mod time and date
			. ($this->crc32 ?: self::NO_CRC32)   // crc32
			. \pack('V', $this->c_len)            // compressed filesize
			. \pack('V', $this->u_len)            // uncompressed filesize
			. \pack('v', \strlen($this->name))     // length of filename
			. "\x00\x00";                        // extra field length
			// TODO: extra field 4.5 Extensible data fields, the UNIX Extra Field (0x000d)
	}

	public function setCrc32($v) : void
	{
		if (\is_int($v)) {
			$v = \pack('V', $v);
		}
		if (\is_string($v) && 4 === \strlen($v)) {
			$this->crc32 = $v;
		} else {
			$this->crc32 = self::NO_CRC32;
		}
	}

	public function updateCrc32(string $data) : void
	{
		if (!$this->hctx) {
			// set up the CRC32 hashing context
			$this->hctx = \hash_init('crc32b');
		}
		\hash_update($this->hctx, $data);
	}

	// Local file header
	public function getHeader() : string
	{
		if (self::NO_CRC32 === $this->crc32) {
			$this->flags |= self::FLAG_DATA_DESCRIPTOR;
		}
		return "\x50\x4b\x03\x04" . $this->getEntry() . $this->name;
	}

	// Data descriptor
	public function getDataDescriptor(bool $signature = false) : string
	{
		if ($this->flags & self::FLAG_DATA_DESCRIPTOR) {
			if ($this->hctx) {
				// hash_final is a string, not an integer and need to
				// reverse the hash_final string to little endian
				$crc = \hash_final($this->hctx, true);
				$this->setCrc32($crc[3].$crc[2].$crc[1].$crc[0]);
				$this->hctx = null;
			}
			return ($signature ? "\x50\x4b\x07\x08" : '')
				. $this->crc32
				. \pack('V', $this->c_len)
				. \pack('V', $this->u_len);
		}
		return '';
	}

	// Central directory file header
	public function getDirEntry(int $offset) : string
	{
		// now add to central directory record
		return "\x50\x4b\x01\x02"
			. "\x00\x03"         // version made by UNIX
			. $this->getEntry()
			. "\x00\x00"         // file comment length
			. "\x00\x00"         // disk number start
			. "\x00\x00"         // internal file attributes
			. "\x20\x00\x00\x00" // external file attributes - 'archive' bit set
			. \pack('V', $offset) // relative offset of local header
			. $this->name;
			// TODO: extra field 4.5 Extensible data fields, the UNIX Extra Field (0x000d)
	}
}
