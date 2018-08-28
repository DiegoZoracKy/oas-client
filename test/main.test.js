'use strict';

const path = require('path');
const assert = require('assert');
const nock = require('nock');
const oasClient = require('../');
const YAML = require('yamljs');

function generatePetsServerMock() {
    nock('http://127.0.0.1/v2')
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

    it('Must contain all operations and operationIds loading the file from YML', function () {
        const test = {
            input: {
                apiSpecYmlPath: path.join(__dirname, '/test-data/openapi-pets.yml'),
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

        const apiSpec = YAML.load(test.input.apiSpecYmlPath);
        const apiClient = oasClient.create(apiSpec);
        const sortedProperties = Object.keys(apiClient).sort();
        assert.deepEqual(sortedProperties, test.expected);
    });

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

    it('Must set a server variable', function () {
        nock('http://127.0.0.1/v1')
            .get('/pets/007')
            .reply(200, "ok v1")

        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
        };

        const options = {
            serverVariables: {
                version: "v1"
            }
        }
        const apiClient = oasClient.create(test.input.apiSpec, options);
        return apiClient.showPetById({ data: { petId: '007' } })
            .then(({ data }) => assert.equal(data, "ok v1"));
    });

    it('Must use default server variable when defining a value not expected by the spec "enum"', function () {
        nock('http://127.0.0.1/v2')
            .get('/pets/007')
            .reply(200, "ok forced to v2")

        const test = {
            input: {
                apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
            },
        };

        const options = {
            serverVariables: {
                version: "v3"
            }
        }
        const apiClient = oasClient.create(test.input.apiSpec, options);
        return apiClient.showPetById({ data: { petId: '007' } })
            .catch(({ data }) => assert.equal(data, "ok forced to v2"));
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

    it('Must validate post body before performing a request and raise an "Unexpected Content-Type" error', function () {
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
        }, {contentType: 'application/x-www-form-urlencoded'})
            .catch(err => assert.equal(err, `Error: Invalid Body Schema: unexpected Content-Type 'application/x-www-form-urlencoded'`));
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

    // it('Must use default server variables', function () {
    //     const test = {
    //         input: {
    //             apiSpec: require(path.join(__dirname, '/test-data/openapi-pets.json')),
    //             config: {
    //                 paths: {
    //                     'GET /login': {
    //                         defaultParameters: {
    //                             cookie: { Authorization: 'path specific token on the fly' },
    //                         }
    //                     }
    //                 }
    //             }
    //         },
    //     };

    //     const apiClient = oasClient.create(test.input.apiSpec, test.input.config);
    //     return apiClient.login()
    //         .then(({ data }) => assert.equal(data, 'Authorization=path specific token on the fly;'));
    // });

    // const options = {
    //     serverVariables: {
    //         basePath: 'v3'
    //     }
    // };
    // const apiClient = oasClient.create(apiSpec, options);


    // const data = { petId: 'Janis' };

    // apiClient.showPetById({ data }, options)
    //     .then(console.log)
    //     .catch(console.error);
});
