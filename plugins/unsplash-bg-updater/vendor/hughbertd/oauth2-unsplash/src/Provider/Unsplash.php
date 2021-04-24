<?php

namespace Unsplash\OAuth2\Client\Provider;

use League\OAuth2\Client\Provider\AbstractProvider;
use League\OAuth2\Client\Token\AccessToken;
use Psr\Http\Message\ResponseInterface;

/**
 * Class Unsplash
 * @package Unsplash\OAuth2\Client\Provider
 * @see https://unsplash.com/documentation#user-authentication
 * @see http://oauth2-client.thephpleague.com/providers/implementing
 */
class Unsplash extends AbstractProvider
{
    /**
     * Used for public scoped requests
     * @return string
     */
    public function getClientId()
    {
        return $this->clientId;
    }

    /**
     * @return string
     */
    public function getBaseAuthorizationUrl()
    {
        return 'https://unsplash.com/oauth/authorize';
    }

    /**
     * @param array $params
     * @return string
     */
    public function getBaseAccessTokenUrl(array $params)
    {
        return 'https://unsplash.com/oauth/token';
    }

    /**
     * @param AccessToken $token
     * @return string
     */
    public function getResourceOwnerDetailsUrl(AccessToken $token)
    {
        return 'https://api.unsplash.com/me?access_token=' . $token;
    }

    /**
     * @return array
     */
    protected function getDefaultScopes()
    {
        return ['public'];
    }

    /**
     * @param ResponseInterface $response
     * @param array|string $data
     * @throws \Exception
     */
    protected function checkResponse(ResponseInterface $response, $data)
    {
        if (! empty($data['error'])) {
            $message = $data['error'].": ".$data['error_description'];
            throw new \Exception($message);
        }
    }

    /**
     * @param array $response
     * @param AccessToken $token
     * @return UnsplashResourceOwner
     */
    protected function createResourceOwner(array $response, AccessToken $token)
    {
        return new UnsplashResourceOwner($response);
    }

    /**
     * @return string
     */
    protected function getScopeSeparator()
    {
        return ' ';
    }
}