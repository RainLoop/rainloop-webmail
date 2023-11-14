<?php

namespace SnappyMail\HTTP\Request;

use SnappyMail\HTTP\Response;

class Socket extends \SnappyMail\HTTP\Request
{
	public function supportsSSL() : bool
	{
		return \function_exists('openssl_open');
	}

	private static $Authorization = [];
	protected function __doRequest(string &$method, string &$request_url, &$body, array $extra_headers) : Response
	{
		$parts = \parse_url($request_url);

		$host = $parts['host'];

		// Set a default port.
		if (\array_key_exists('port', $parts)) {
			$host .= ":{$parts['port']}";
		} else if ('http' === $parts['scheme'] || 'https' === $parts['scheme']) {
			$parts['port'] = self::getSchemePort($parts['scheme']);
		} else {
			throw new \RuntimeException("Scheme '{$parts['scheme']}' unsupported");
		}

		if (!\array_key_exists('path', $parts)) {
			$parts['path'] = '/';
		}

		$headers = array(
			"{$method} {$parts['path']}".(isset($parts['query']) ? "?{$parts['query']}" : '')." HTTP/1.1",
			"Host: {$host}",
			"User-Agent: {$this->user_agent}",
			'Connection: Close',
		);
		if (isset($extra_headers['Authorization'])) {
			static::$Authorization[$host] = $extra_headers['Authorization'];
		} else if (isset(static::$Authorization[$host])) {
			$extra_headers['Authorization'] = static::$Authorization[$host];
		}
		if ($extra_headers) {
			$headers = \array_merge($headers, $extra_headers);
		}
		$headers = \implode("\r\n", $headers);
		if (!\is_null($body)) {
			if (!\stripos($headers,'Content-Type')) {
				$headers .= "\r\nContent-Type: application/x-www-form-urlencoded";
			}
			$headers .= "\r\nContent-Length: ".\strlen($body);
		}

		$context = \stream_context_create();
		if ('https' === $parts['scheme']) {
			$parts['host'] = 'ssl://'.$parts['host'];
			\stream_context_set_option($context, 'ssl', 'verify_peer_name', true);
			if ($this->verify_peer || $this->ca_bundle) {
				\stream_context_set_option($context, 'ssl', 'verify_peer', true);
				if ($this->ca_bundle) {
					if (\is_dir($this->ca_bundle) || (\is_link($this->ca_bundle) && \is_dir(\readlink($this->ca_bundle)))) {
						\stream_context_set_option($context, 'ssl', 'capath', $this->ca_bundle);
					} else {
						\stream_context_set_option($context, 'ssl', 'cafile', $this->ca_bundle);
					}
				}
			} else {
				\stream_context_set_option($context, 'ssl', 'allow_self_signed', true);
			}
		} else {
			$parts['host'] = 'tcp://'.$parts['host'];
		}

		$errno = 0;
		$errstr = '';

		$sock = \stream_socket_client("{$parts['host']}:{$parts['port']}", $errno, $errstr, $this->timeout, STREAM_CLIENT_CONNECT, $context);
		if (false === $sock) {
			throw new \RuntimeException($errstr);
		}

		\stream_set_timeout($sock, $this->timeout);

		\fwrite($sock, $headers . "\r\n\r\n");
		if (!\is_null($body)) {
			\fwrite($sock, $body);
		}

		# Read all headers
		$chunked = false;
		$response_headers = array();
		$data = \rtrim(\fgets($sock, 1024)); # read line
		$code = \intval(\explode(' ', $data)[1]??0);
		while (\strlen($data)) {
			$response_headers[] = $data;
			$chunked |= \preg_match('#Transfer-Encoding:.*chunked#i', $data);

			if (401 === $code && $this->auth['user'] && !isset($extra_headers['Authorization'])) {
				// Basic authentication
				if ($this->auth['type'] & self::AUTH_BASIC && \preg_match("/WWW-Authenticate:\\s+Basic\\s+realm=([^\\r\\n]*)/i", $data, $match)) {
					$extra_headers['Authorization'] = "Authorization: Basic " . \base64_encode($this->auth['user'] . ':' . $this->auth['pass']);
					\fclose($sock);
					return $this->__doRequest($method, $request_url, $body, $extra_headers);
				}
				// Digest authentication
				else if ($this->auth['type'] & self::AUTH_DIGEST && \preg_match("/WWW-Authenticate:\\s+Digest\\s+([^\\r\\n]*)/i", $data, $match)) {
					$challenge = [];
					foreach (\split(',', $match[1]) as $i) {
						$ii = \split('=', \trim($i), 2);
						if (!empty($ii[1]) && !empty($ii[0])) {
							$challenge[$ii[0]] = \preg_replace('/^"/','', \preg_replace('/"$/','', $ii[1]));
						}
					}
					$a1 = \md5($this->auth['user'] . ':' . $challenge['realm'] . ':' . $this->auth['pass']);
					$a2 = \md5($method . ':' . $request_url);
					if (empty($challenge['qop'])) {
						$digest = \md5($a1 . ':' . $challenge['nonce'] . ':' . $a2);
					} else {
						$challenge['cnonce'] = 'Req2.' . \random_int();
						if (empty($challenge['nc'])) {
							$challenge['nc'] = 1;
						}
						$nc     = \sprintf('%08x', $challenge['nc']++);
						$digest = \md5($a1 . ':' . $challenge['nonce'] . ':' . $nc . ':' . $challenge['cnonce'] . ':auth:' . $a2);
					}
					$extra_headers['Authorization'] = "Authorization: Digest "
						. ' username="' . \addcslashes($this->auth['user'], '\\"') . '",'
						. ' realm="' . $challenge['realm'] . '",'
						. ' nonce="' . $challenge['nonce'] . '",'
						. ' uri="' . $request_url . '",'
						. ' response="' . $digest . '"'
						. (empty($challenge['opaque']) ? '' : ', opaque="' . $challenge['opaque'] . '"')
						. (empty($challenge['qop']) ? '' : ', qop="auth", nc=' . $nc . ', cnonce="' . $challenge['cnonce'] . '"');

					\fclose($sock);
					return $this->__doRequest($method, $request_url, $body, $extra_headers);
				}
			}

			$data = \rtrim(\fgets($sock, 1024)); # read next line
		}

		# Read body
		$body = '';
		if (\is_resource($this->stream)) {
			while (!\feof($sock)) {
				if ($chunked) {
					$chunk = \hexdec(\trim(\fgets($sock, 8)));
					if (!$chunk) { break; }
					while ($chunk > 0) {
						$tmp = \fread($sock, $chunk);
						\fwrite($this->stream, $tmp);
						$chunk -= \strlen($tmp);
					}
					"\r\n" === \fread($sock, 2);
				} else {
					\fwrite($this->stream, \fread($sock, 1024));
//					\stream_copy_to_stream($sock, $this->stream);
				}
			}
		} else {
			$max_bytes = $this->max_response_kb * 1024;
			while (!\feof($sock) && (!$max_bytes || \strlen($body) < $max_bytes)) {
				if ($chunked) {
					$chunk = \hexdec(\trim(\fgets($sock, 8)));
					if (!$chunk) { break; }
					while ($chunk > 0) {
						$tmp = \fread($sock, $chunk);
						$body .= $tmp;
						$chunk -= \strlen($tmp);
					}
					"\r\n" === \fread($sock, 2);
				} else {
					$body .= \fread($sock, 1024);
				}
			}
		}

		\fclose($sock);

		return new Response($request_url, $code, $response_headers, $body);
	}

}
