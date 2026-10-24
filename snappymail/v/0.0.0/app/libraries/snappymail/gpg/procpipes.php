<?php
/**
 * GnuPG
 */

namespace SnappyMail\GPG;

class ProcPipes
{
	private $pipes;

	function __construct(array $pipes)
	{
		// Set streams as non-blocking.
		foreach ($pipes as $pipe) {
			\stream_set_blocking($pipe, 0);
			\stream_set_write_buffer($pipe, Base::CHUNK_SIZE);
			\stream_set_chunk_size($pipe, Base::CHUNK_SIZE);
			\stream_set_read_buffer($pipe, Base::CHUNK_SIZE);
		}
		$this->pipes = $pipes;
	}

	function __destruct()
	{
		$this->closeAll();
	}

	public function closeAll() : void
	{
		foreach (\array_keys($this->pipes) as $number) {
			$this->close($number);
		}
	}

	public function get(int $number)
	{
		if (\array_key_exists($number, $this->pipes) && \is_resource($this->pipes[$number])) {
			return $this->pipes[$number];
		}
	}

	public function close(int $number) : void
	{
		if (\array_key_exists($number, $this->pipes)) {
			\fflush($this->pipes[$number]);
			\fclose($this->pipes[$number]);
			unset($this->pipes[$number]);
		}
	}

	private $buffers = [];
	public function readPipeLines(int $number) : iterable
	{
		$pipe = $this->get($number);
		if ($pipe) {
			$chunk     = \fread($pipe, Base::CHUNK_SIZE);
			$length    = \strlen($chunk);
			$eolLength = \strlen(\PHP_EOL);
			if (!isset($this->buffers[$number])) {
				$this->buffers[$number] = '';
			}
			$this->buffers[$number] .= $chunk;
			while (false !== ($pos = \strpos($this->buffers[$number], \PHP_EOL))) {
				yield \substr($this->buffers[$number], 0, $pos);
				$this->buffers[$number] = \substr($this->buffers[$number], $pos + $eolLength);
			}
		}
	}

	public function writePipe(int $number, string $data, int $length = 0) : int
	{
		$pipe = $this->get($number);
		if ($pipe) {
			$chunk  = \substr($data, 0, $length ?: \strlen($data));
			$length = \strlen($chunk);
			$length = \fwrite($pipe, $chunk, $length);
			if (!$length) {
				// If we wrote 0 bytes it was either EAGAIN or EPIPE. Since
				// the pipe was seleted for writing, we assume it was EPIPE.
				// There's no way to get the actual error code in PHP. See
				// PHP Bug #39598. https://bugs.php.net/bug.php?id=39598
				$this->close($number);
			}
			return $length ?: 0;
		}
		return 0;
	}
}
