import {existsSync, readFileSync} from 'fs';

export const getEnv = (key: string, fallback: string = ''): string => {
    const def = process.env[key];
    if (typeof def === 'string') {
        return def;
    }
    const lkey = key.toLowerCase();
    for (const prop of Object.keys(process.env)) {
        const value = process.env[prop];
        if (prop.toLowerCase() === lkey && typeof value === 'string') {
            return value;
        }
    }
    return fallback;
}
if (existsSync(__dirname + '/../.env')) {
    const data: String = readFileSync(__dirname + '/../env', {encoding: 'utf-8'});
    for (const row of data.split("\n")) {
        if (!row.startsWith('#')) {
            const env = row.split('=', 2);
            process.env[env[0].replace(/^\s+|\s+$/, '')] = env[1].replace(/(^\s*"\s*)|(\s*"\s*$)|(\s*$)|(^\s*)/ig, '');
        }
    }
}
