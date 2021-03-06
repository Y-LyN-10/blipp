'use strict';

// Load modules
const Chalk = require('chalk');
const Hoek = require('hoek');
const Joi = require('joi');
const Pkg = require('../package.json');

// Declare internals
const internals = {
    schema: {
        showAuth: Joi.boolean().default(false),
        showScope: Joi.boolean().default(false),
        showStart: Joi.boolean().default(true)
    }
};

exports.register = function (server, options) {

    const result = Joi.validate(options, internals.schema);
    Hoek.assert(!result.error, result.error && result.error.annotate());
    options = result.value;

    server.expose('text', function () {

        const info = this.info();
        return internals.printableInfo(info, options);
    });

    server.expose('info', () => {

        return internals.getRouteInfo(server, options);
    });

    if (options.showStart) {
        server.events.on('start', () => {

            const out = server.plugins[Pkg.name].text();
            console.log(out);
        });
    }
};

internals.printableInfo = function (connections, options) {

    let out = '';
    for (let i = 0; i < connections.length; ++i) {
        const connection = connections[i];

        out += internals.printableConnection(connection, options);
    }

    return out;
};


internals.printableConnection = function (connection, options) {

    let out = internals.printableTitle(connection, options) + '\n';
    out += internals.printableRoutes(connection.routes, options);
    return out;
};


internals.printableRoutes = function (routes, options) {

    let out = '';
    for (let i = 0; i < routes.length; ++i) {
        const show = routes[i];

        const method = internals.formatMethod(show.method);
        const description = internals.formatDescription(show.description);
        const auth = internals.formatAuth(show.auth);
        const scope = internals.formatScope(show.scope);
        const path = internals.formatPath(show.path);

        const props = [method, path, description];

        if (options.showScope) {
            props.splice(2, 0, scope);
        }

        if (options.showAuth) {
            props.splice(2, 0, auth);
        }

        out += `${props.join(' ')}\n`;
    }

    return out;
};


internals.printableTitle = function (connection) {

    const title = Chalk.underline(connection.uri);
    return Chalk.cyan(title);
};


internals.getRouteInfo = function (server, options) {

    const routingTable = server.table();

    const connectionInfo = {
        uri: server.info.uri,
        routes: []
    };

    internals.connectionInfo(server, routingTable, options, connectionInfo);

    return [connectionInfo];
};

internals.connectionInfo = function (server, routes, options, connectionInfo) {

    for (let i = 0; i < routes.length; ++i) {
        const route = routes[i];

        const defaultStrategy = Hoek.reach(server, 'auth.settings.default.strategies');
        let authStrategy = route.settings.auth ? route.settings.auth.strategies.toString() : false;
        const authScope = (route.settings.auth && route.settings.auth.access) ?
            route.settings.auth.access[0].scope.selection.toString() : false;

        if (route.settings.auth === undefined) {
            authStrategy = defaultStrategy ? String(defaultStrategy) : false;
        }

        const show = {
            method: route.method.toUpperCase(),
            path: route.path,
            description: route.settings.description || ''
        };

        if (options.showAuth) {
            show.auth = authStrategy;
        }

        if (options.showScope) {
            show.scope = authScope;
        }

        connectionInfo.routes.push(show);
    }

    connectionInfo.routes.sort((a, b) => a.path.localeCompare(b.path));
};


internals.formatPath = function (path) {

    path = internals.ljust(path, 30);
    path = path.replace(/({.*?})/g, Chalk.gray('$1'));
    return path;
};


internals.ljust = function (string, amount) {

    const padding = ' ';

    while (string.length < amount) {
        string += padding;
    }

    return string;
};


internals.formatMethod = function (method) {

    method = '  ' + method.toUpperCase();
    method = Chalk.green(method);
    method = internals.ljust(method, 18);
    return method;
};

internals.formatAuth = function (auth) {

    if (auth === false) {
        auth = Chalk.red('none');
    }
    else {
        auth = Chalk.green(auth);
    }

    auth = internals.ljust(auth, 30);
    return auth;
};

internals.formatScope = function (scope) {

    if (scope === false) {
        scope = Chalk.red('none');
    }
    else {
        scope = Chalk.green(scope);
    }

    scope = internals.ljust(scope, 50);
    return scope;
};

internals.formatDescription = function (description) {

    description = description || '';
    description = Chalk.yellow(description);

    return description;
};

exports.pkg = Pkg;
