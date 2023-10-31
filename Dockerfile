FROM node:20-alpine as build

# Create app directory
RUN mkdir -p /app && chown node:node /app
USER node
WORKDIR /app

# Install dependencies
COPY --chown=node:node package*.json ./
RUN npm ci

# Build
ENV NODE_ENV production
COPY --chown=node:node tsconfig.json tailwind.config.js remix.config.js remix.env.d.ts ./
COPY --chown=node:node public public
COPY --chown=node:node app app
RUN npm run build
RUN npm prune

# Release
FROM node:20-alpine as release

# Create app directory
RUN mkdir -p /app && chown node:node /app
USER node
WORKDIR /app

# Copy build files
COPY --chown=node:node --from=build /app/package.json package.json
COPY --chown=node:node --from=build /app/node_modules node_modules
COPY --chown=node:node --from=build /app/public public
COPY --chown=node:node --from=build /app/build build

# Exports
EXPOSE 3000
CMD [ "./node_modules/.bin/remix-serve", "./build/index.js" ]
