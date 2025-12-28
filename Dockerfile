FROM debian:latest
WORKDIR /app
VOLUME /app/package/backend/ssl
VOLUME /app/package/backend/config

COPY . /app/package

RUN apt-get update && apt-get install -y unzip nodejs

# Fix timezone
RUN rm /etc/localtime && ln -s /usr/share/zoneinfo/Europe/Berlin /etc/localtime

RUN echo "export NODE_ENV=deployment" >> ~/.bashrc # Set node configuration to use
RUN echo "export NODE_CONFIG_DIR=/app/package/backend/config" >> ~/.bashrc # Set node configuration to use
ENV NODE_ENV=deployment
ENV NODE_CONFIG_DIR=/app/package/backend/config

# Sleep is neccessary in order to have the VOLUME's bound correctly before starting our script.
CMD ["sh", "-c", "cd /app/package/backend && sleep 1 && node index.js"]

#-------run:
#cwd: home/runner/runner/_work/praxis_internal/praxis_internal/package:
#docker run --rm -it --volume .:/app -w /app/backend -e "NODE_ENV=deployment" node index.js