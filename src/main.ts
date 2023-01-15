import {Logger} from './logger';
import {serve} from './server';
import {handle} from './handler';
import {start} from './open-api';

const serverLogger = new Logger('server');

serve(serverLogger, handle);
start(serverLogger);