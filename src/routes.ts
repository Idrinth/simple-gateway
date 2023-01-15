import {getEnv} from './get-env';
import {existsSync} from 'fs';

export interface Target {
    host: string,
    path: string,
    secure: boolean,
}
export interface Routes {
    [id: string]: {
        target: Target,
        require: {
            'api-key': boolean,
            authorization: boolean,
            cookie: boolean,
        },
        'open-api': string
    },
}
const toTarget = (route: string): Target => {
    return {
        host: route.replace(/https?:\/\/(.+?)($|\/.*$)/i, '$1'),
        path: route.replace(/https?:\/\/.+?(\/|$)/i, '/'),
        secure: route.replace(/:.+$/, '') === 'https',
    };    
};
const routes: Routes = existsSync(__dirname + '/../routes.idrinth.json') ? require(__dirname + '/../routes.idrinth.json') : {};

for (const key of Object.keys(routes)) {
    if (typeof routes[key].target === 'undefined') {
        throw new Error(`${key} has no target defined.`);
    }
    if (typeof routes[key].require === 'undefined') {
        routes[key].require = {
            authorization: false,
            cookie: false,
            'api-key': false,
        };
    }
    const route = routes[key].target;
    if (typeof route === 'string') {
        routes[key].target = toTarget(route);
    }
    if (typeof routes[key]['open-api'] === 'undefined') {
        routes[key]['open-api'] = `http${routes[key].target.secure ? 's' : ''}://${routes[key].target.host}/open-api`;
    }
}

for (const key of Object.keys(process.env)) {
    const value = process.env[key];
    if (key.match(/^ROUTE_/i) && typeof value === 'string' && value.match(/^https?:\/\//i)) {
        const id: string = key.replace(/^ROUTE_/i, '').toLowerCase();
        const restriction = getEnv(`RESTRICT_${id}`).toUpperCase();
        const target = toTarget(value);
        routes[id.replace(/_/g, '-')] = {
            target,
            'open-api': getEnv(`OPEN_API_${id}`, `http${target.secure ? 's' : ''}://${target.host}/open-api`),
            require: {
                'api-key': restriction === 'API-KEY',
                cookie: restriction === 'COOKIE',
                authorization: restriction === 'AUTHORIZATION',
            }
        };
    }
}

export default routes;