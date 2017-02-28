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

trait PseudoRandomStringGeneratorTrait
{
    /**
     * Validates the length argument of a random string.
     *
     * @param int $length The length to validate.
     *
     * @throws \InvalidArgumentException
     */
    public function validateLength($length)
    {
        if (!is_int($length)) {
            throw new \InvalidArgumentException('getPseudoRandomString() expects an integer for the string length');
        }

        if ($length < 1) {
            throw new \InvalidArgumentException('getPseudoRandomString() expects a length greater than 1');
        }
    }

    /**
     * Converts binary data to hexadecimal of arbitrary length.
     *
     * @param string $binaryData The binary data to convert to hex.
     * @param int    $length     The length of the string to return.
     *
     * @return string
     */
    public function binToHex($binaryData, $length)
    {
        return mb_substr(bin2hex($binaryData), 0, $length);
    }
}
