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

class OpenSslPseudoRandomStringGenerator implements PseudoRandomStringGeneratorInterface
{
    use PseudoRandomStringGeneratorTrait;

    /**
     * @const string The error message when generating the string fails.
     */
    const ERROR_MESSAGE = 'Unable to generate a cryptographically secure pseudo-random string from openssl_random_pseudo_bytes().';

    /**
     * @throws FacebookSDKException
     */
    public function __construct()
    {
        if (!function_exists('openssl_random_pseudo_bytes')) {
            throw new FacebookSDKException(static::ERROR_MESSAGE . 'The function openssl_random_pseudo_bytes() does not exist.');
        }
    }

    /**
     * @inheritdoc
     */
    public function getPseudoRandomString($length)
    {
        $this->validateLength($length);

        $wasCryptographicallyStrong = false;
        $binaryString = openssl_random_pseudo_bytes($length, $wasCryptographicallyStrong);

        if ($binaryString === false) {
            throw new FacebookSDKException(static::ERROR_MESSAGE . 'openssl_random_pseudo_bytes() returned an unknown error.');
        }

        if ($wasCryptographicallyStrong !== true) {
            throw new FacebookSDKException(static::ERROR_MESSAGE . 'openssl_random_pseudo_bytes() returned a pseudo-random string but it was not cryptographically secure and cannot be used.');
        }

        return $this->binToHex($binaryString, $length);
    }
}
