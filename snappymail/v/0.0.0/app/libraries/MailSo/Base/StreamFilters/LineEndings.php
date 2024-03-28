<?php

namespace MailSo\Base\StreamFilters;

class LineEndings extends \php_user_filter
{
	#[\ReturnTypeWillChange]
//	public function filter($in, $out, &$consumed, bool $closing): int
	public function filter($in, $out, &$consumed, $closing)
	{
		while ($bucket = \stream_bucket_make_writeable($in)) {
			$bucket->data = \preg_replace('/\R/s', "\r\n", \rtrim($bucket->data, "\r"));
//			$bucket->data = \preg_replace('/\R/s', "\n", \rtrim($bucket->data, "\r"));
			$consumed += $bucket->datalen;
			\stream_bucket_append($out, $bucket);
		}
/*
	private $buffer = '';
		while ($bucket = \stream_bucket_make_writeable($in)) {
			$this->buffer += $bucket->data;
			$consumed += $bucket->datalen;
		}
		$this->buffer = \preg_replace('/\R/s', "\r\n", $this->buffer);
		\stream_bucket_append($out, \stream_bucket_new($this->stream, $this->buffer));
		$this->buffer = '';
*/
		return PSFS_PASS_ON;
	}

//	public onClose(): void
//	public onCreate(): bool

	public static function appendTo($fp)
	{
		\stream_filter_append($fp, 'crlf', STREAM_FILTER_ALL);
	}
}

\stream_filter_register('crlf', LineEndings::class);
