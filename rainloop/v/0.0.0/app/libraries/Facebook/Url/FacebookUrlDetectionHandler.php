<?php
/**
 * Copyright 2014 Facebook, Inc.
 *
 * You are hereby granted a non-exclusive, worldwide, royalty-free license to
 * use, copy, modify, and distribute this software in source code or binary
 * form for use in connection with the web services and APIs provided by
 * Facebook.
 *
 * As with any software that integrates with the Facebook platform, your use
 * of this software is subject to the Facebook Developer Principles and
 * Policies [http://developers.facebook.com/policy/]. This copyright notice
 * shall be included in all copies or substantial portions of the software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */
namespace Facebook\Url;

/**
 * Class FacebookUrlDetectionHandler
 *
 * @package Facebook
 */
class FacebookUrlDetectionHandler implements UrlDetectionInterface
{
    /**
     * @inheritdoc
     */
    public function getCurrentUrl()
    {
        return $this->getHttpScheme() . '://' . $this->getHostName() . $this->getServerVar('REQUEST_URI');
    }

    /**
     * Get the currently active URL scheme.
     *
     * @return string
     */
    protected function getHttpScheme()
    {
        return $this->isBehindSsl() ? 'https' : 'http';
    }

    /**
     * Tries to detect if the server is running behind an SSL.
     *
     * @return boolean
     */
    protected function isBehindSsl()
    {
        // Check for proxy first
        $protocol = $this->getHeader('X_FORWARDED_PROTO');
        if ($protocol) {
            return $this->protocolWithActiveSsl($protocol);
        }

        $protocol = $this->getServerVar('HTTPS');
        if ($protocol) {
            return $this->protocolWithActiveSsl($protocol);
        }

        return (string)$this->getServerVar('SERVER_PORT') === '443';
    }

    /**
     * Detects an active SSL protocol value.
     *
     * @param string $protocol
     *
     * @return boolean
     */
    protected function protocolWithActiveSsl($protocol)
    {
        $protocol = strtolower((string)$protocol);

        return in_array($protocol, ['on', '1', 'https', 'ssl'], true);
    }

    /**
     * Tries to detect the host name of the server.
     *
     * Some elements adapted from
     *
     * @see https://github.com/symfony/HttpFoundation/blob/master/Request.php
     *
     * @return string
     */
    protected function getHostName()
    {
        // Check for proxy first
        if ($host = $this->getHeader('X_FORWARDED_HOST')) {
            $elements = explode(',', $host);
            $host = $elements[count($elements) - 1];
        } elseif (!$host = $this->getHeader('HOST')) {
            if (!$host = $this->getServerVar('SERVER_NAME')) {
                $host = $this->getServerVar('SERVER_ADDR');
            }
        }

        // trim and remove port number from host
        // host is lowercase as per RFC 952/2181
        $host = strtolower(preg_replace('/:\d+$/', '', trim($host)));

        // Port number
        $scheme = $this->getHttpScheme();
        $port = $this->getCurrentPort();
        $appendPort = ':' . $port;

        // Don't append port number if a normal port.
        if (($scheme == 'http' && $port == '80') || ($scheme == 'https' && $port == '443')) {
            $appendPort = '';
        }

        return $host . $appendPort;
    }

    protected function getCurrentPort()
    {
        // Check for proxy first
        $port = $this->getHeader('X_FORWARDED_PORT');
        if ($port) {
            return (string)$port;
        }

        $protocol = (string)$this->getHeader('X_FORWARDED_PROTO');
        if ($protocol === 'https') {
            return '443';
        }

        return (string)$this->getServerVar('SERVER_PORT');
    }

    /**
     * Returns the a value from the $_SERVER super global.
     *
     * @param string $key
     *
     * @return string
     */
    protected function getServerVar($key)
    {
        return isset($_SERVER[$key]) ? $_SERVER[$key] : '';
    }

    /**
     * Gets a value from the HTTP request headers.
     *
     * @param string $key
     *
     * @return string
     */
    protected function getHeader($key)
    {
        return $this->getServerVar('HTTP_' . $key);
    }
}
