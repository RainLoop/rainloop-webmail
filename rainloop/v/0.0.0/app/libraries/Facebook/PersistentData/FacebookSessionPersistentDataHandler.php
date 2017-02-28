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
namespace Facebook\PersistentData;

use Facebook\Exceptions\FacebookSDKException;

/**
 * Class FacebookSessionPersistentDataHandler
 *
 * @package Facebook
 */
class FacebookSessionPersistentDataHandler implements PersistentDataInterface
{
    /**
     * @var string Prefix to use for session variables.
     */
    protected $sessionPrefix = 'FBRLH_';

    /**
     * Init the session handler.
     *
     * @param boolean $enableSessionCheck
     *
     * @throws FacebookSDKException
     */
    public function __construct($enableSessionCheck = true)
    {
        if ($enableSessionCheck && session_status() !== PHP_SESSION_ACTIVE) {
            throw new FacebookSDKException(
                'Sessions are not active. Please make sure session_start() is at the top of your script.',
                720
            );
        }
    }

    /**
     * @inheritdoc
     */
    public function get($key)
    {
        if (isset($_SESSION[$this->sessionPrefix . $key])) {
            return $_SESSION[$this->sessionPrefix . $key];
        }

        return null;
    }

    /**
     * @inheritdoc
     */
    public function set($key, $value)
    {
        $_SESSION[$this->sessionPrefix . $key] = $value;
    }
}
