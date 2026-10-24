<?php
namespace OAuth2\GrantType;

/**
 * Client Credentials Parameters 
 */
class ClientCredentials implements IGrantType
{
    /**
     * Defines the Grant Type
     * 
     * @var string  Defaults to 'client_credentials'. 
     */
    const GRANT_TYPE = 'client_credentials';

    /**
     * Adds a specific Handling of the parameters
     * 
     * @return array of Specific parameters to be sent.
     * @param  mixed  $parameters the parameters array (passed by reference)
     */
    public function validateParameters(&$parameters)
    {
    }
}
