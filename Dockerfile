FROM node:19-alpine

RUN mkdir /project
COPY . /project
RUN cd project && npm install --production

ENTRYPOINT ['node', '/project/index.js']
