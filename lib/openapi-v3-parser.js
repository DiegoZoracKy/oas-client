'use strict';

function isExtensionProperty(property) {
	return property[0].toLowerCase() == 'x';
}

function isOperationObject(property) {
	const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
	return methods.includes(property);
}

function mountParameters(operationParameters, pathItemParameters) {
	const parameters = [];

	const operationParametersKeys = {};
	if (operationParameters) {
		operationParameters.forEach(item => {
			const { name, in: location } = item;
			operationParametersKeys[`${name}${location}`] = item;

			parameters.push(item);
		});
	}

	if (pathItemParameters) {
		pathItemParameters.forEach(item => {
			const { name, in: location } = item;
			if (operationParametersKeys[`${name}${location}`]) {
				return;
			}

			parameters.push(item);
		});
	}

	return parameters;
}

function setUrlVariables(url, specVariables, variables = {}) {
	for (let variable in specVariables) {
		let defaultValue = specVariables[variable].default;
		let variableEnum = specVariables[variable].enum;

		let value = variables[variable];
		if (!value || (variableEnum && !variableEnum.includes(value))) {
			value = defaultValue;
		}

		url = url.replace(RegExp(`{${variable}}`), value);
	}

	return url;
}

function mountPathUrls(path, servers, serverVariables, baseServerUrl = '') {
	const pathUrls = [];

	if (!servers || !servers.length) {
		pathUrls.push(`${baseServerUrl}${path}`);
		return pathUrls;
	}

	servers.forEach(({ url, variables }) => {
		let serverUrl = url;
		if (variables) {
			serverUrl = setUrlVariables(url, variables, serverVariables);
		}

		pathUrls.push(`${serverUrl}${path}`);
	});

	return pathUrls;
}

function getRequestBodies(requestBody) {
	const requestBodies = [];

	const required = requestBody.required;
	for (let contentType in requestBody.content) {
		const schema = requestBody.content[contentType].schema;
		requestBodies.push({
			contentType,
			required,
			schema,
		})
	}

	return requestBodies;
}

function getByRefPath(spec, refPath) {
	refPath = refPath.replace('#/', '');

	let result;
	refPath.split('/').forEach((item, i) => {
		result = i === 0 ? spec[item] : result[item];
	});

	return result;
}

function getRoutes(apiSpec, { baseServerUrl, serverVariables } = {}) {
	const routes = [];

	const rootServers = apiSpec.servers;
	const paths = apiSpec.paths;

	for (let pathKey in paths) {
		if (isExtensionProperty(pathKey)) {
			continue;
		}

		const pathItem = paths[pathKey];
		const pathItemParameters = pathItem.parameters;
		const pathItemServers = pathItem.servers;

		for (let pathItemKey in pathItem) {
			if (isExtensionProperty(pathItemKey) || !isOperationObject(pathItemKey)) {
				continue;
			}

			const operation = pathItem[pathItemKey];
			const operationParameters = operation.parameters;
			const operationServers = operation.servers;
			const operationId = operation.operationId;
			const requestBody = operation.requestBody;

			if(requestBody && requestBody.content) {
				for (let mediaType in requestBody.content) {
					if(requestBody.content[mediaType].schema && requestBody.content[mediaType].schema.$ref) {
						requestBody.content[mediaType].schema = getByRefPath(apiSpec, requestBody.content[mediaType].schema.$ref);
					}
				}
			}

			const path = pathKey;
			const method = pathItemKey.toLowerCase();
			const parameters = mountParameters(operationParameters, pathItemParameters);
			const servers = operationServers || pathItemServers || rootServers;
			const urls = mountPathUrls(path, servers, serverVariables, baseServerUrl);

			const route = {
				path,
				operationId,
				method,
				urls,
				parameters,
				requestBody
			};

			routes.push(route);
		}
	}

	return routes;
}

module.exports = {
	getRoutes
};