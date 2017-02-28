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
namespace Facebook;

use Facebook\Exceptions\FacebookSDKException;

/**
 * Class SignedRequest
 *
 * @package Facebook
 */
class SignedRequest
{
    /**
     * @var FacebookApp The FacebookApp entity.
     */
    protected $app;

    /**
     * @var string The raw encrypted signed request.
     */
    protected $rawSignedRequest;

    /**
     * @var array The payload from the decrypted signed request.
     */
    protected $payload;

    /**
     * Instantiate a new SignedRequest entity.
     *
     * @param FacebookApp $facebookApp      The FacebookApp entity.
     * @param string|null $rawSignedRequest The raw signed request.
     */
    public function __construct(FacebookApp $facebookApp, $rawSignedRequest = null)
    {
        $this->app = $facebookApp;

        if (!$rawSignedRequest) {
            return;
        }

        $this->rawSignedRequest = $rawSignedRequest;

        $this->parse();
    }

    /**
     * Returns the raw signed request data.
     *
     * @return string|null
     */
    public function getRawSignedRequest()
    {
        return $this->rawSignedRequest;
    }

    /**
     * Returns the parsed signed request data.
     *
     * @return array|null
     */
    public function getPayload()
    {
        return $this->payload;
    }

    /**
     * Returns a property from the signed request data if available.
     *
     * @param string     $key
     * @param mixed|null $default
     *
     * @return mixed|null
     */
    public function get($key, $default = null)
    {
        if (isset($this->payload[$key])) {
            return $this->payload[$key];
        }

        return $default;
    }

    /**
     * Returns user_id from signed request data if available.
     *
     * @return string|null
     */
    public function getUserId()
    {
        return $this->get('user_id');
    }

    /**
     * Checks for OAuth data in the payload.
     *
     * @return boolean
     */
    public function hasOAuthData()
    {
        return $this->get('oauth_token') || $this->get('code');
    }

    /**
     * Creates a signed request from an array of data.
     *
     * @param array $payload
     *
     * @return string
     */
    public function make(array $payload)
    {
        $payload['algorithm'] = isset($payload['algorithm']) ? $payload['algorithm'] : 'HMAC-SHA256';
        $payload['issued_at'] = isset($payload['issued_at']) ? $payload['issued_at'] : time();
        $encodedPayload = $this->base64UrlEncode(json_encode($payload));

        $hashedSig = $this->hashSignature($encodedPayload);
        $encodedSig = $this->base64UrlEncode($hashedSig);

        return $encodedSig . '.' . $encodedPayload;
    }

    /**
     * Validates and decodes a signed request and saves
     * the payload to an array.
     */
    protected function parse()
    {
        list($encodedSig, $encodedPayload) = $this->split();

        // Signature validation
        $sig = $this->decodeSignature($encodedSig);
        $hashedSig = $this->hashSignature($encodedPayload);
        $this->validateSignature($hashedSig, $sig);

        $this->payload = $this->decodePayload($encodedPayload);

        // Payload validation
        $this->validateAlgorithm();
    }

    /**
     * Splits a raw signed request into signature and payload.
     *
     * @returns array
     *
     * @throws FacebookSDKException
     */
    protected function split()
    {
        if (strpos($this->rawSignedRequest, '.') === false) {
            throw new FacebookSDKException('Malformed signed request.', 606);
        }

        return explode('.', $this->rawSignedRequest, 2);
    }

    /**
     * Decodes the raw signature from a signed request.
     *
     * @param string $encodedSig
     *
     * @returns string
     *
     * @throws FacebookSDKException
     */
    protected function decodeSignature($encodedSig)
    {
        $sig = $this->base64UrlDecode($encodedSig);

        if (!$sig) {
            throw new FacebookSDKException('Signed request has malformed encoded signature data.', 607);
        }

        return $sig;
    }

    /**
     * Decodes the raw payload from a signed request.
     *
     * @param string $encodedPayload
     *
     * @returns array
     *
     * @throws FacebookSDKException
     */
    protected function decodePayload($encodedPayload)
    {
        $payload = $this->base64UrlDecode($encodedPayload);

        if ($payload) {
            $payload = json_decode($payload, true);
        }

        if (!is_array($payload)) {
            throw new FacebookSDKException('Signed request has malformed encoded payload data.', 607);
        }

        return $payload;
    }

    /**
     * Validates the algorithm used in a signed request.
     *
     * @throws FacebookSDKException
     */
    protected function validateAlgorithm()
    {
        if ($this->get('algorithm') !== 'HMAC-SHA256') {
            throw new FacebookSDKException('Signed request is using the wrong algorithm.', 605);
        }
    }

    /**
     * Hashes the signature used in a signed request.
     *
     * @param string $encodedData
     *
     * @return string
     *
     * @throws FacebookSDKException
     */
    protected function hashSignature($encodedData)
    {
        $hashedSig = hash_hmac(
            'sha256',
            $encodedData,
            $this->app->getSecret(),
            $raw_output = true
        );

        if (!$hashedSig) {
            throw new FacebookSDKException('Unable to hash signature from encoded payload data.', 602);
        }

        return $hashedSig;
    }

    /**
     * Validates the signature used in a signed request.
     *
     * @param string $hashedSig
     * @param string $sig
     *
     * @throws FacebookSDKException
     */
    protected function validateSignature($hashedSig, $sig)
    {
        if (mb_strlen($hashedSig) === mb_strlen($sig)) {
            $validate = 0;
            for ($i = 0; $i < mb_strlen($sig); $i++) {
                $validate |= ord($hashedSig[$i]) ^ ord($sig[$i]);
            }
            if ($validate === 0) {
                return;
            }
        }

        throw new FacebookSDKException('Signed request has an invalid signature.', 602);
    }

    /**
     * Base64 decoding which replaces characters:
     *   + instead of -
     *   / instead of _
     *
     * @link http://en.wikipedia.org/wiki/Base64#URL_applications
     *
     * @param string $input base64 url encoded input
     *
     * @return string decoded string
     */
    public function base64UrlDecode($input)
    {
        $urlDecodedBase64 = strtr($input, '-_', '+/');
        $this->validateBase64($urlDecodedBase64);

        return base64_decode($urlDecodedBase64);
    }

    /**
     * Base64 encoding which replaces characters:
     *   + instead of -
     *   / instead of _
     *
     * @link http://en.wikipedia.org/wiki/Base64#URL_applications
     *
     * @param string $input string to encode
     *
     * @return string base64 url encoded input
     */
    public function base64UrlEncode($input)
    {
        return strtr(base64_encode($input), '+/', '-_');
    }

    /**
     * Validates a base64 string.
     *
     * @param string $input base64 value to validate
     *
     * @throws FacebookSDKException
     */
    protected function validateBase64($input)
    {
        if (!preg_match('/^[a-zA-Z0-9\/\r\n+]*={0,2}$/', $input)) {
            throw new FacebookSDKException('Signed request contains malformed base64 encoding.', 608);
        }
    }
}
