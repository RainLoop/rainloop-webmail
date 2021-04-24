# Unsplash Provider for OAuth 2.0 Client
[![Build Status](https://travis-ci.org/HughbertD/oauth2-unsplash.svg?branch=master)](https://travis-ci.org/HughbertD/oauth2-unsplash)

Provides Unsplash OAuth 2.0 support as an implementation of PHP League's [OAuth 2.0 Client](https://github.com/thephpleague/oauth2-client)

## Installation

To install, use composer:

```
composer require hughbertd/oauth2-unsplash
```

## Usage

Usage is the same as The League's OAuth client, using `\CrewLabs\OAuth2\Client\Provider\Unsplash` as the provider.

### Authorization Code Flow

```php
<?php
require_once('./vendor/autoload.php');
session_start();

$provider = new \Unsplash\OAuth2\Client\Provider\Unsplash([
    'clientId' => '{clientId}',
    'clientSecret' => '{clientSecret}',
    'redirectUri' => 'http://example.com',
]);

if (!isset($_GET['code'])) {
    // If we don't have an authorization code then get one
    $authUrl = $provider->getAuthorizationUrl();
    $_SESSION['oauth2state'] = $provider->getState();
    header('Location: ' . $authUrl);
    exit;
}

if (isset($_GET['code']) && !isset($_SESSION['token'])) {
    try {
        // Try to get an access token (using the authorization code grant)
        $token = $provider->getAccessToken('authorization_code', [
            'code' => $_GET['code']
        ]);

    } catch (Exception $e) {
        print($e->getMessage());
        exit;
    }

    // Use this to interact with an API on the users behalf
    $_SESSION['token'] = $token->getToken();
}

if (isset($_SESSION['token'])) {
    $user = $provider->getResourceOwner($_SESSION['token']);
    printf('Hello %s!', $user->getName());
    return;
}
```

## Testing

``` bash
$ ./vendor/bin/phpunit
```

## Credits

- [Hugh Downer](https://github.com/hughbertd)
