import {createInterface} from 'readline';
import {existsSync, writeFileSync} from 'fs';

const io = createInterface({
    input: process.stdin, 
    output: process.stdout,
});
const data = existsSync('../routes.idrinth.json') ? require('../routes.idrinth.json') : {};

io.write(JSON.stringify(data, null, 2));
io.question('Please enter the route you want to register(i.e. abc for /abc/): ', (route) => {
    io.question('Where should the route point? (https://abc.de/my-route/): ', (url) => {
        io.question('Where should the open-api be retrieved from? (https://abc.de/open-api/): ', (docs) => {
            io.question('Should the gateway check for cookie existance?(y/n): ', (cookie) => {
                io.question('Should the gateway check for api-key existance?(y/n): ', (apiKey) => {
                    io.question('Should the gateway check for authorization header existance?(y/n): ', (auth) => {
                        data[route] = {
                            target: url,
                            'open-api': docs,
                            required: {
                                cookie: cookie === 'y',
                                'api-key': apiKey === 'y',
                                authorization: auth === 'y',
                            },
                        };
                        writeFileSync('../routes.idrinth.json', JSON.stringify(data));
                        io.close();
                        process.exit(0);
                    });
                });
            });
        });
    });
});