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

function mountPathUrls(path, servers, serverUrls, baseServerUrl = '') {
	const pathUrls = [];

	if (!servers || !servers.length) {
		pathUrls.push(`${baseServerUrl}${path}`);
		return pathUrls;
	}

	servers.forEach(({ url, variables }) => {
		let serverUrl = url;
		if (variables) {
			const serverVariables = serverUrls[url] && serverUrls[url].serverVariables;
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

function getRoutes(apiSpec, { baseServerUrl, serverUrls } = {}) {
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

			const path = pathKey;
			const method = pathItemKey.toLowerCase();
			const parameters = mountParameters(operationParameters, pathItemParameters);
			const servers = operationServers || pathItemServers || rootServers;
			const urls = mountPathUrls(path, servers, serverUrls, baseServerUrl);

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