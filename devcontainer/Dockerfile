FROM debian
WORKDIR /usr/app
RUN apt-get update
RUN apt-get install curl git nano vim tmux -y
# from https://github.com/nodesource/distributions?tab=readme-ov-file#debian-versions. Installs node and npm
RUN curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh && chmod +x nodesource_setup.sh && ./nodesource_setup.sh
RUN apt-get install nodejs -y
# Install angular cli
RUN npm install -g @angular/cli@19.2.14
RUN echo "export PS1='(\e[0;31mangular-dev\e[0;0m) \u@\h:\w$ '" >> /root/.bashrc
CMD ["/bin/bash -l"]
