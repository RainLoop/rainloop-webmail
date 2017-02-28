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
namespace Facebook\PseudoRandomString;

use Facebook\Exceptions\FacebookSDKException;

class UrandomPseudoRandomStringGenerator implements PseudoRandomStringGeneratorInterface
{

    use PseudoRandomStringGeneratorTrait;

    /**
     * @const string The error message when generating the string fails.
     */
    const ERROR_MESSAGE = 'Unable to generate a cryptographically secure pseudo-random string from /dev/urandom. ';

    /**
     * @throws FacebookSDKException
     */
    public function __construct()
    {
        if (ini_get('open_basedir')) {
            throw new FacebookSDKException(
                static::ERROR_MESSAGE .
                'There is an open_basedir constraint that prevents access to /dev/urandom.'
            );
        }

        if (!is_readable('/dev/urandom')) {
            throw new FacebookSDKException(
                static::ERROR_MESSAGE .
                'Unable to read from /dev/urandom.'
            );
        }
    }

    /**
     * @inheritdoc
     */
    public function getPseudoRandomString($length)
    {
        $this->validateLength($length);

        $stream = fopen('/dev/urandom', 'rb');
        if (!is_resource($stream)) {
            throw new FacebookSDKException(
                static::ERROR_MESSAGE .
                'Unable to open stream to /dev/urandom.'
            );
        }

        if (!defined('HHVM_VERSION')) {
            stream_set_read_buffer($stream, 0);
        }

        $binaryString = fread($stream, $length);
        fclose($stream);

        if (!$binaryString) {
            throw new FacebookSDKException(
                static::ERROR_MESSAGE .
                'Stream to /dev/urandom returned no data.'
            );
        }

        return $this->binToHex($binaryString, $length);
    }
}
