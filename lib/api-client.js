'use strict';

const makeApiCall = require('./make-api-call');

class apiClient {
	constructor({ routes, paths = {}, serverUrlIndex, validateParameters = true, allowUnexpectedParams = true, validateBody = false, defaultParameters, pathDefaultParameters = {}, axiosInstance }) {
		this.$paths = paths;
		this.$defaultParameters = defaultParameters;
		this.$pathDefaultParameters = pathDefaultParameters;
		this.$allowUnexpectedParams = allowUnexpectedParams;
		this.$validateParameters = validateParameters;
		this.$validateBody = validateBody;
		this.$serverUrlIndex = serverUrlIndex;
		this.$axiosInstance = axiosInstance;
		this.$routes = routes;

		this.$configRoutes();
		this.$setPropertiesToNonEnumerable();
	}

	$configRoutes() {
		this.$routes.forEach(parsedRoute => {
			const url = parsedRoute.urls[this.$serverUrlIndex];
			const method = parsedRoute.method;
			const expectedParameters = parsedRoute.parameters;
			const requestBody = parsedRoute.requestBody;

			const pathOperation = `${parsedRoute.method.toUpperCase()} ${parsedRoute.path}`;
			const pathConfig = this.$paths[pathOperation];
			if (pathConfig && pathConfig.defaultParameters) {
				this.$setPathDefaultParameters({
					[pathOperation]: pathConfig.defaultParameters
				});
			}

			const validateParameters = this.$validateParameters;
			const allowUnexpectedParams = this.$allowUnexpectedParams;
			const validateBody = this.$validateBody;
			const defaultParameters = this.$getPathDefaultParameters(pathOperation);
			const axiosInstance = this.$axiosInstance;

			const apiCall = makeApiCall({ method, url, expectedParameters, requestBody, pathOperation, axiosInstance }, { defaultParameters, validateParameters, allowUnexpectedParams, validateBody });
			this[pathOperation] = apiCall;

			let operationId = (pathConfig && pathConfig.operationId) || parsedRoute.operationId;
			if (operationId) {
				this[operationId] = this[pathOperation];
			}
		});
	}

	$setPropertiesToNonEnumerable() {
		Object.keys(this).forEach(key => {
			if (key[0] === '$') {
				Object.defineProperty(this, key, { enumerable: false });
			}
		});
	}

	$setDefaultParameters(defaultParameters) {
		this.$defaultParameters = Object.assign({}, this.$defaultParameters, defaultParameters);
	}

	$setPathDefaultParameters(pathDefaultParameters) {
		this.$pathDefaultParameters = Object.assign({}, this.$pathDefaultParameters, pathDefaultParameters);
	}

	$getPathDefaultParameters(pathOperation) {
		return Object.assign({}, this.$defaultParameters, this.$pathDefaultParameters[pathOperation]);
	}
}

module.exports = apiClient;