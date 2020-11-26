#!/usr/bin/env bash

SERVER_NAME=localhost
SUBJECT="/C=RU/ST=RND/L=Taganrog/O=Umbrella Web/CN=${SERVER_NAME}"

mkdir -p ./ssl

if [ -f ./ssl/${SERVER_NAME}.cert ]; then
    rm -rf ./ssl/${SERVER_NAME}.cert
fi

if [ -f ./ssl/${SERVER_NAME}.key ]; then
    rm -rf ./ssl/${SERVER_NAME}.key
fi

# Generating ROOT pem files
openssl req -x509 -new -nodes -newkey rsa:2048 -keyout ./ssl/server_rootCA.key -sha256 -days 1024 -out ./ssl/server_rootCA.pem -subj "${SUBJECT}" 2> /dev/null

# Generating v3.ext file
cat <<EOF > ./ssl/v3.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${SERVER_NAME}
DNS.2 = www.${SERVER_NAME}
EOF

echo " - Generating SSL key file"
openssl req -new -newkey rsa:2048 -sha256 -nodes -newkey rsa:2048 -keyout ./ssl/${SERVER_NAME}.key -subj "${SUBJECT}" -out ./ssl/server_rootCA.csr 2> /dev/null

echo " - Generating SSL certificate file"
openssl x509 -req -in ./ssl/server_rootCA.csr -CA ./ssl/server_rootCA.pem -CAkey ./ssl/server_rootCA.key -CAcreateserial -out ./ssl/${SERVER_NAME}.cert -days 3650 -sha256 -extfile ./ssl/v3.ext 2> /dev/null

# echo " - Adding certificate into local keychain"
# sudo security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" ./ssl/server_rootCA.pem 2> /dev/null

echo " - Runing garbage collector"
rm -rf ./ssl/server_rootCA.csr ./ssl/server_rootCA.key ./ssl/server_rootCA.pem ./ssl/v3.ext ./.srl
