'use strict';

const path = require('path');
const assert = require('assert');
const nock = require('nock');
const oasClient = require('../');

function generatePetsServerMock() {
    nock('http://127.0.0.1')
        .get('/pets/007')
        .reply(200, "ok")
        .get('/pets?limit=1984')
        .reply(200, "ok")
        .get('/pets?unknown=param')
        .reply(200, "ok")
        .post('/pets')
        .reply(200, "ok")
        .get('/login')
        .reply(function (uri, requestBody) {
            return this.req.headers.cookie;
        });
}

describe('Create an api client', function () {
    beforeEach(generatePetsServerMock);

    it('Must contain all operations and operationIds', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
            expected: [
                'GET /login',
                'GET /pets',
                'GET /pets/{petId}',
                'POST /pets',
                'createPets',
                'listPets',
                'login',
                'showPetById'
            ]
        };

        const apiClient = oasClient.create(test.input.apiSpec);
        const sortedProperties = Object.keys(apiClient).sort();
        assert.deepEqual(sortedProperties, test.expected);
    });

    it('Must pass a parameter via path using "data"', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec);
        return apiClient.showPetById({ data: { petId: '007' } })
            .then(({ data }) => assert.equal(data, "ok"));
    });

    it('Must pass a parameter via path using "path"', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec);
        return apiClient.showPetById({ path: { petId: '007' } })
            .then(({ data }) => assert.equal(data, "ok"));
    });

    it('Must pass a parameter via query using "data"', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec);
        return apiClient.listPets({ data: { limit: '1984' } })
            .then(({ data }) => assert.equal(data, "ok"));
    });

    it('Must pass a parameter via query using "query"', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec);
        return apiClient.listPets({ query: { limit: '1984' } })
            .then(({ data }) => assert.equal(data, "ok"));
    });

    it('Must handle a required parameter and raise a "Missing parameters" error', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec);
        return apiClient.listPets()
            .catch(err => assert.equal(err, `Error: Missing parameters: "limit" in "query"`));
    });

    it('Must not raise an error due to a missing required parameter', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
                config: {
                    validateParameters: false
                }
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.listPets({ query: { unknown: 'param' } })
            .then(({ data }) => assert.equal(data, "ok"));
    });

    it('Must not accept an unexpected parameter', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
                config: {
                    validateParameters: false,
                    allowUnexpectedParams: false
                }
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.listPets({ query: { unknown: 'param' } })
            .catch(err => assert.equal(err.statusCode, '404'));
    });

    it('Must validate post body before performing a request and raise an "Invalid Body Schema" error', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
                config: {
                    validateBody: true
                }
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.createPets({
            body: {
                name: "Janis",
            }
        })
            .catch(err => assert.equal(err, `Error: Invalid Body Schema: data should have required property 'status'`));
    });

    it('Must validate post body before performing a request', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
                config: {
                    validateBody: true
                }
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.createPets({
            body: {
                name: "Janis",
                status: "messing around",
            }
        })
            .then(({ data }) => assert.equal(data, "ok"));
    });

    it('Must not validate post body before performing a request', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.createPets()
            .then(({ data }) => assert.equal(data, "ok"));
    });


    it('Must pass a cookie', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json'))
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.login({cookie: { Authorization: 'bearer token!!!' } })
            .then(({ data }) => assert.equal(data, 'Authorization=bearer token!!!;'));
    });

    it('Must set a default parameter for all requests', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
                config: {
                    defaultParameters: {
                        cookie: { Authorization: 'bearer token!!!' },
                    }
                }
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.login()
            .then(({ data }) => assert.equal(data, 'Authorization=bearer token!!!;'));
    });

    it('Must set a default parameter for a specific path operation during init', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
                config: {
                    paths: {
                        'GET /login': {
                            defaultParameters: {
                                cookie: { Authorization: 'path specific token' },
                            }
                        }
                    }
                }
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.login()
            .then(({ data }) => assert.equal(data, 'Authorization=path specific token;'));
    });

    it('Must set a default parameter for a specific path operation on the fly', function () {
        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
                config: {
                    paths: {
                        'GET /login': {
                            defaultParameters: {
                                cookie: { Authorization: 'path specific token on the fly' },
                            }
                        }
                    }
                }
            },
        };

        const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
        return apiClient.login()
            .then(({ data }) => assert.equal(data, 'Authorization=path specific token on the fly;'));
    });
});
